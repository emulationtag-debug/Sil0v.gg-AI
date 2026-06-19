// videoPipeline.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function processVideoRequest(message, fileManager, model) {
    const videoUrl = message.attachments.first()?.url || message.content.match(/https?:\/\/\S+/)?.[0];
    const tempPath = path.join(__dirname, `temp_${Date.now()}.mp4`);

    try {
        // 1. Download
        console.log(`Downloading: ${videoUrl}`);
        execSync(`yt-dlp -f "best[ext=mp4]" -o "${tempPath}" "${videoUrl}"`);

        // 2. Upload to Gemini
        console.log("Uploading to Gemini...");
        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: "video/mp4",
        });

        // 3. Poll for processing completion
        let file = await fileManager.getFile(uploadResult.file.name);
        while (file.state === "PROCESSING") {
            console.log("Waiting for video processing...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            file = await fileManager.getFile(uploadResult.file.name);
        }

        if (file.state === "FAILED") throw new Error("Video processing failed on server.");

        // 4. Generate Analysis
        const result = await model.generateContent([
            { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
            { text: "Analyze this video, summarize its key points, and identify any notable visual elements." }
        ]);

        // 5. Cleanup & Return
        await fileManager.deleteFile(uploadResult.file.name);
        fs.unlinkSync(tempPath);
        
        return result.response.text();

    } catch (err) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        throw err;
    }
}

module.exports = { processVideoRequest };
