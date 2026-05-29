import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import formidable from "formidable";
import fs from "fs";
import admin from "firebase-admin";
import crypto from "crypto";

// @ts-ignore
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';
import { parseOffice } from 'officeparser';

// Initialize Firebase Admin for token verification
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "ai-studio-applet-webapp-1bc09",
  });
}

// Custom request interface to hold decodede token
interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

// Authentication Middleware
const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

async function parsePDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true); // true = raw text
    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
      resolve(pdfParser.getRawTextContent());
    });
    pdfParser.parseBuffer(buffer);
  });
}

import { GoogleGenAI, Type, Schema } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export interface TaskStatus {
  status: "uploading" | "processing" | "completed" | "error";
  stage?: "extracting" | "generating" | "saving";
  data?: any;
  error?: string;
}

const documentTasks = new Map<string, TaskStatus>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/process-document", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const form = formidable({ 
        multiples: false,
        maxFileSize: 50 * 1024 * 1024 // 50MB limit to allow larger textbooks and PDFs
      });
      
      const [fields, files] = await form.parse(req);
      
      if (!files.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const fileType = uploadedFile.mimetype;
      let originalFilename = uploadedFile.originalFilename;
      if (!originalFilename || !path.extname(originalFilename)) {
          if (fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || fileType === "application/vnd.ms-powerpoint") originalFilename = "file.pptx";
          else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileType === "application/msword") originalFilename = "file.docx";
          else if (fileType === "application/pdf") originalFilename = "file.pdf";
          else originalFilename = "file.txt";
      }
      
      const taskId = crypto.randomUUID();
      
      res.json({ taskId }); // respond immediately to avoid proxy timeout

      // Start processing in the background
      (async () => {
        let filePath = uploadedFile.filepath;
        try {
          if (originalFilename) {
              const ext = path.extname(originalFilename);
              if (ext && !filePath.endsWith(ext)) {
                  const newFilePath = filePath + ext;
                  fs.renameSync(filePath, newFilePath);
                  filePath = newFilePath;
              }
          }

          documentTasks.set(taskId, { status: "processing", stage: "extracting" });
          let extractedText = "";

          if (fileType === "application/pdf") {
            const dataBuffer = fs.readFileSync(filePath);
            extractedText = await parsePDF(dataBuffer);
          } else if (fileType === "text/plain") {
            extractedText = fs.readFileSync(filePath, "utf-8");
          } else if (
            fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
            fileType === "application/msword" ||
            originalFilename?.endsWith('.docx') ||
            originalFilename?.endsWith('.doc')
          ) {
            try {
              const result = await mammoth.extractRawText({ path: filePath });
              extractedText = result.value;
            } catch (e: any) {
              throw new Error("Failed to parse Word document. Please ensure it is a valid .docx file.");
            }
          } else if (
            fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
            fileType === "application/vnd.ms-powerpoint" ||
            originalFilename?.endsWith('.pptx') ||
            originalFilename?.endsWith('.ppt')
          ) {
            try {
              const officeResult = await parseOffice(filePath) as any;
              extractedText = (officeResult && officeResult.toText) ? officeResult.toText() : String(officeResult);
            } catch (e: any) {
              console.error("Office parser error:", e);
              throw new Error("Failed to parse PowerPoint presentation: " + e.message);
            }
          } else {
            throw new Error("Unsupported file type. Use PDF, TXT, DOCX, or PPTX.");
          }

          if (!extractedText.trim()) {
            throw new Error("Could not extract text from document");
          }

          documentTasks.set(taskId, { status: "processing", stage: "generating" });

          // Truncate text if it's too long to avoid token limits, safely limit to first ~100000 characters
          const safeText = extractedText.substring(0, 100000);

          const prompt = `
Analyze the following educational material. Extract the key concepts, create a summary, generate optimal flashcards, and create a 10-question adaptive quiz. 
You MUST generate exactly 10 questions for the quiz, no more, no less.

CRITICAL INSTRUCTIONS FOR FLASHCARDS:
Optimize the flashcards specifically for the substantial content of the provided document. They must NOT be generic metadata flashcards (e.g., do NOT make flashcards about the document's title, author, or source like "Study Material" or "Source: Presentasi").
Instead, extract the most crucial definitions, core terms, and deep conceptual questions directly from the actual material.
- Front: A concise question or core concept.
- Back: A clear, accurate, and concise explanation tailored for active recall studying.

Respond in strict JSON matching the provided schema.

Text:
${safeText}
`;

          let responseText = "";
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              const ai = getAiClient();
              const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      summary: {
                        type: Type.OBJECT,
                        description: "Hierarchical summary of the material",
                        properties: {
                          title: { type: Type.STRING },
                          keyPoints: { 
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          },
                          mainConcepts: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                term: { type: Type.STRING },
                                explanation: { type: Type.STRING }
                              }
                            }
                          }
                        },
                        required: ["title", "keyPoints", "mainConcepts"]
                      },
                      flashcards: {
                        type: Type.ARRAY,
                        description: "Flashcards for active recall. Must contain conceptual material, not document metadata.",
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            front: { type: Type.STRING, description: "Core term or specific question based on content" },
                            back: { type: Type.STRING, description: "Definition or specific answer based on content" }
                          },
                          required: ["front", "back"]
                        }
                      },
                      quiz: {
                        type: Type.ARRAY,
                        description: "10 multiple choice quiz questions based on the text",
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            question: { type: Type.STRING },
                            options: {
                              type: Type.ARRAY,
                              items: { type: Type.STRING }
                            },
                            correctAnswer: { type: Type.STRING, description: "Must exactly match one of the options" },
                            explanation: { type: Type.STRING, description: "Explanation of why the answer is correct" }
                          },
                          required: ["question", "options", "correctAnswer", "explanation"]
                        }
                      }
                    },
                    required: ["summary", "flashcards", "quiz"]
                  }
                }
              });
              
              if (response.text) {
                responseText = response.text;
                // strict clean json in case the AI wraps it in markdown blocks
                if (responseText.trim().startsWith("```")) {
                  responseText = responseText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '');
                }
                const result = JSON.parse(responseText);
                documentTasks.set(taskId, { status: "completed", data: result });
                break; 
              } else {
                throw new Error("Failed to generate content");
              }
            } catch (apiError: any) {
              attempts++;
              console.error(`Gemini API error or Parse error (attempt ${attempts}):`, apiError);
              if (attempts >= maxAttempts) {
                throw apiError;
              }
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
            }
          }
          
          if (attempts >= maxAttempts && !responseText) {
            throw new Error("Repeated failure to generate content after max attempts.");
          }
        } catch (error: any) {
          console.error("Document processing error async:", error);
          if (error?.code === 1009 || error?.message?.includes('maxFileSize exceeded')) {
            documentTasks.set(taskId, { status: "error", error: "File too large. Maximum size is 50MB." });
          } else if (error?.status === 503 || error?.message?.includes("experiencing high demand") || error?.message?.includes("503") || (error?.code && error?.code === 503)) {
            documentTasks.set(taskId, { status: "error", error: "Sistem AI sedang ramai, mohon coba beberapa saat lagi." });
          } else {
            documentTasks.set(taskId, { status: "error", error: error.message || "Failed to process document." });
          }
        } finally {
          if (filePath) {
            try { fs.unlinkSync(filePath); } catch (e) { console.error("Error cleaning up file", e); }
          }
        }
      })();
    } catch (error: any) {
      console.error("Upload formidable parse error:", error);
      if (error?.code === 1009 || error?.message?.includes('maxFileSize exceeded')) {
        return res.status(413).json({ error: "File too large. Maximum size is 50MB." });
      }
      res.status(500).json({ error: "File upload failed." });
    }
  });

  app.get("/api/process-document/status/:taskId", verifyToken, (req, res) => {
    const taskId = req.params.taskId;
    const task = documentTasks.get(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  });

  app.post("/api/chat-tutor", verifyToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { message, context, history, imageBase64, imageMimeType } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const ai = getAiClient();
      
      const systemInstruction = `You are a helpful, expert AI tutor named 'Clever Study AI Tutor'. You are helping a student understand their study material.
Use the following study material context to answer their questions. Keep your answers concise, encouraging, and easy to understand.
If they ask something completely unrelated to their studies, gently guide them back.

Material Context:
${context}
`;
      
      const contents: Array<any> = [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "Understood. I am ready to help the student based on the material."}] }
      ];

      // Limit history to the last 20 messages to prevent excessive token usage
      const safeHistory = Array.isArray(history) ? history.slice(-20) : [];

      if (safeHistory.length > 0) {
        for (const msg of safeHistory) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
      }

      const finalUserParts: any[] = [{ text: message }];
      
      if (imageBase64 && imageMimeType) {
        finalUserParts.push({
           inlineData: {
             data: imageBase64.split(',')[1] || imageBase64,
             mimeType: imageMimeType
           }
        });
      }

      contents.push({ role: "user", parts: finalUserParts });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("AI Tutor error:", error);
      if (error?.status === 503 || error?.message?.includes("experiencing high demand")) {
         return res.status(503).json({ error: "Sistem AI sedang ramai, mohon coba beberapa saat lagi." });
      }
      res.status(500).json({ error: "Failed to get response from AI Tutor" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
