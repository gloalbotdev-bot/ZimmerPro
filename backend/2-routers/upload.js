import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/authorization.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const backendRoot = join(__dirname, '..');
const uploadsDir = join(backendRoot, 'uploads'); 
console.log(`📁 [Upload Router] Uploads directory: ${uploadsDir}`);

if (!existsSync(uploadsDir)) {
  mkdir(uploadsDir, { recursive: true })
    .then(() => console.log(`✅ [Upload Router] Created uploads directory: ${uploadsDir}`))
    .catch(err => console.error(`❌ [Upload Router] Failed to create uploads directory: ${err.message}`));
} else {
  console.log(`✅ [Upload Router] Uploads directory exists: ${uploadsDir}`);
}

// Upload file endpoint - accepts base64 data
router.post('/', authenticate, checkRole('admin', 'zimmer_owner', 'complex_owner', 'manager'), async (req, res, next) => {
  try {
    console.log(`📥 [Upload] Received upload request`);
    console.log(`📥 [Upload] Request body keys:`, Object.keys(req.body));
    console.log(`📥 [Upload] fileName:`, req.body.fileName);
    console.log(`📥 [Upload] fileType:`, req.body.fileType);
    console.log(`📥 [Upload] fileData length:`, req.body.fileData?.length || 0);
    
    const { fileData, fileName, fileType } = req.body;
    
    if (!fileData) {
      console.error(`❌ [Upload] No file data provided`);
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Check file size (base64 is ~33% larger than original)
    const base64Size = fileData.length;
    const estimatedOriginalSize = (base64Size * 3) / 4;
    const maxSize = 50 * 1024 * 1024; // 50MB original file size
    
    if (estimatedOriginalSize > maxSize) {
      return res.status(413).json({ 
        error: 'File too large',
        message: `File size exceeds 50MB limit. Please use a smaller file.`
      });
    }

    // Extract base64 data (handle data:image/jpeg;base64, prefix)
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    let buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch (err) {
      return res.status(400).json({ error: 'Invalid base64 data' });
    }

    // Determine file extension from fileType or fileName
    let extension = 'jpg';
    if (fileName) {
      const match = fileName.match(/\.([^.]+)$/);
      if (match) extension = match[1];
    } else if (fileType) {
      if (fileType.includes('jpeg') || fileType.includes('jpg')) extension = 'jpg';
      else if (fileType.includes('png')) extension = 'png';
      else if (fileType.includes('gif')) extension = 'gif';
      else if (fileType.includes('webp')) extension = 'webp';
      else if (fileType.includes('video')) extension = 'mp4';
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomStr}.${extension}`;
    const filepath = join(uploadsDir, filename);

    // Save file
    try {
      console.log(`💾 [Upload] Attempting to save file to: ${filepath}`);
      console.log(`💾 [Upload] Uploads directory exists: ${existsSync(uploadsDir)}`);
      console.log(`💾 [Upload] Uploads directory path: ${uploadsDir}`);
      
      await writeFile(filepath, buffer);
      console.log(`✅ [Upload] File successfully saved to: ${filepath}`);
      console.log(`✅ [Upload] File size: ${buffer.length} bytes`);
      
      // Verify file exists
      if (existsSync(filepath)) {
        console.log(`✅ [Upload] File verified to exist at: ${filepath}`);
        // List files in uploads directory
        const { readdir } = await import('fs/promises');
        const files = await readdir(uploadsDir);
        console.log(`📂 [Upload] Files in uploads directory (${files.length}):`, files.slice(0, 10));
      } else {
        console.error(`❌ [Upload] File was not found after saving: ${filepath}`);
      }
    } catch (writeError) {
      console.error(`❌ [Upload] Error writing file to ${filepath}:`, writeError);
      console.error(`❌ [Upload] Error details:`, writeError.message);
      console.error(`❌ [Upload] Error stack:`, writeError.stack);
      throw writeError;
    }

    // Build URL from request (works for both http and https)
    let fileUrl;
    
    // Check for BASE_URL in env first
    if (process.env.BASE_URL) {
      let baseUrl = process.env.BASE_URL;
    
      if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4);
      }
   
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      fileUrl = `${baseUrl}/uploads/${filename}`;
    } else {
 
      const protocol = req.headers['x-forwarded-proto'] || 
                      (req.secure ? 'https' : 'http') || 
                      'http';
      const host = req.headers['x-forwarded-host'] || 
                   req.get('host') || 
                   req.headers.host || 
                   'localhost:3000';
      if (host.includes('localhost:3000') || host.includes('127.0.0.1:3000')) {
       fileUrl = `/uploads/${filename}`;
      } else {
       fileUrl = `${protocol}://${host}/uploads/${filename}`;
      }
    }
    
  
    console.log(`📤 [Upload] File saved: ${filename}`);
    console.log(`📤 [Upload] Request headers:`, {
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
      host: req.get('host'),
      protocol: req.protocol
    });
    console.log(`📤 [Upload] File URL: ${fileUrl}`);

    res.json({
      success: true,
      url: fileUrl,
      filename: filename
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    next(error);
  }
});

export default router;
