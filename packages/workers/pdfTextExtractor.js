const PDFParser = require("pdf2json");

/**
 * extractPDFcontent using an ArrayBuffer and pdf2json.
 * @param {ArrayBuffer} arrayBuffer The ArrayBuffer containing the PDF data.
 */
function extractPDFcontent(arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new PDFParser();

      // Parse the ArrayBuffer
      pdfParser.parseBuffer(Buffer.from(arrayBuffer));

      // Handle parsing errors
      pdfParser.on("pdfParser_dataError", (errData) => {
        console.error("Error pdfParser:", errData.parserError);
        reject(errData);
      });
      let extractedText = '';
      // Handle successful parsing
      pdfParser.on("pdfParser_dataReady", (pdfDocument) => {
        //extractedText = pdfParser.getRawTextContent();
        for (let i = 0; i <= pdfDocument.Pages.length; i++) {
          const page = pdfDocument.Pages[i];
          if(page) {
            page.Texts.forEach((textItem) => {
              textItem.R.forEach((textRun) => {
                extractedText += decodeURIComponent(textRun.T) + " "; // Decode the text
              });
            });
            extractedText += '\n';
          }
        }
        resolve(extractedText + '\r\n');
      });
    } catch (error) {
      console.error("Error:", error);
      reject(error);
    }
  });
}
module.exports = {
  extractPDFcontent,
};

/*async function generatePDFThumbnail(arrayBuffer, scale = 0.5) {
  try {
    // Dynamically import pdfcanvas module using ESM dynamic import
    //const { createScratchCanvas } = await import("pdf2json/lib/pdfcanvas");

    const pdfParser = new PDFParser();

    // Parse the ArrayBuffer
    pdfParser.parseBuffer(Buffer.from(arrayBuffer));

    return new Promise((resolve, reject) => {
      // Handle parsing errors
      pdfParser.on("pdfParser_dataError", (errData) =>
          reject(errData.parserError)
      );

      // Handle successful parsing
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        // Extract the first page's content
        const firstPage = pdfData.Pages[0];

        if (!firstPage) {
          return reject(new Error("No pages found in the PDF."));
        }

        // Create a canvas using the dynamically imported createScratchCanvas
        const canvasWidth = Math.floor(firstPage.Width * scale);
        const canvasHeight = Math.floor(firstPage.Height * scale);
        const canvas = createCanvas(canvasWidth, canvasHeight);
        //const canvas = createScratchCanvas(canvasWidth, canvasHeight);
        const context = canvas.getContext("2d");

        // Fill the canvas with a white background
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        // Render the text content onto the canvas
        firstPage.Texts.forEach((textItem) => {
          textItem.R.forEach((textRun) => {
            const text = decodeURIComponent(textRun.T); // Decode the text
            const fontSize = textRun.TS[1] * scale; // Scale the font size

            context.font = `${fontSize}px Arial`;
            context.fillStyle = "#000000"; // Set text color to black
            const x = textItem.x * scale;
            const y = textItem.y * scale + fontSize; // Adjust y position by font size

            context.fillText(text, x, y); // Render the text
          });
        });
        resolve(canvas.toBuffer("image/jpeg"));
      });
    });
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return Promise.reject(error);
  }
}*/
