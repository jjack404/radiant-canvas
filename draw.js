// Set up the canvas and grid
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Disable anti-aliasing for sharp pixel edges

const gridSize = 32; // The size of each grid cell in pixels
const scaleFactor = canvas.width / 320; // Scale factor based on true size vs displayed size
const pixelWidth = Math.floor(canvas.width / gridSize);
const pixelHeight = Math.floor(canvas.height / gridSize);

// Initialize the pixels array with a default color
let pixels = new Array(gridSize).fill(null).map(() => new Array(gridSize).fill('#FCE184'));

let isDrawing = false;
let currentColor = '#0F0E0C';
let lastX = null;
let lastY = null;
let hoveredX = null;
let hoveredY = null;

// Stacks for undo and redo
let undoStack = [];
let redoStack = [];

function getCursorPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * scaleFactor;
    const y = (event.clientY - rect.top) * scaleFactor;
    return { x, y };
}

function drawPixel(x, y, color) {
    pixels[y][x] = color;
    ctx.fillStyle = color;
    ctx.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight);
}

function invertColor(hex) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // Convert hex to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    // Invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);
    // Pad each with zeros and return
    return "#" + r.padStart(2, '0') + g.padStart(2, '0') + b.padStart(2, '0');
}

function highlightCell(x, y) {
    // Calculate the cell position
    const cellX = Math.floor(x / pixelWidth);
    const cellY = Math.floor(y / pixelHeight);
    
    // If the cell is different from the last hovered cell, update the highlight
    if (hoveredX !== cellX || hoveredY !== cellY) {
        hoveredX = cellX;
        hoveredY = cellY;
        redrawCanvas(); // Redraw the canvas to clear previous highlight
        
        const color = pixels[cellY][cellX];
        const invertedColor = invertColor(color);
        ctx.strokeStyle = invertedColor;
        ctx.lineWidth = 10; // Width of the border
        ctx.strokeRect(cellX * pixelWidth + 0.5, cellY * pixelHeight + 0.5, pixelWidth - 1, pixelHeight - 1);
    }
}

function drawLine(x1, y1, x2, y2, color) {
    let dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    let dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    let err = dx + dy, e2;

    while (true) {
        let x = Math.floor(x1 / pixelWidth);
        let y = Math.floor(y1 / pixelHeight);
        if (x !== hoveredX || y !== hoveredY) {
            drawPixel(x, y, color);
        }
        if (x1 === x2 && y1 === y2) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
}

function saveState() {
    undoStack.push(JSON.parse(JSON.stringify(pixels)));
    redoStack = [];
}

function undoLastAction() {
    if (undoStack.length > 0) {
        redoStack.push(JSON.parse(JSON.stringify(pixels)));
        pixels = undoStack.pop();
        redrawCanvas();
    }
}

function redoLastAction() {
    if (redoStack.length > 0) {
        undoStack.push(JSON.parse(JSON.stringify(pixels)));
        pixels = redoStack.pop();
        redrawCanvas();
    }
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas first
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            drawPixel(x, y, pixels[y][x]);
        }
    }
    if (hoveredX !== null && hoveredY !== null) {
        // Redraw the highlight for the current hovered cell
        const color = pixels[hoveredY][hoveredX];
        const invertedColor = invertColor(color);
        ctx.strokeStyle = invertedColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(hoveredX * pixelWidth + 0.5, hoveredY * pixelHeight + 0.5, pixelWidth - 1, pixelHeight - 1);
    }
}

function clearCanvas(init = false) {
    if (!init) saveState();
    pixels.forEach(row => row.fill('#FCE184'));
    redrawCanvas();
}

canvas.addEventListener('mousedown', (event) => {
    const { x, y } = getCursorPosition(event);
    lastX = x;
    lastY = y;
    saveState(); // Save the state at the start of a drawing action
    isDrawing = true;
    drawPixel(Math.floor(x / pixelWidth), Math.floor(y / pixelHeight), currentColor); // Draw the first pixel
});

canvas.addEventListener('mousemove', (event) => {
    const { x, y } = getCursorPosition(event);
    if (isDrawing) {
        drawLine(lastX, lastY, x, y, currentColor);
    }
    highlightCell(x, y); // Highlight the cell under cursor
    lastX = x;
    lastY = y;
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    redrawCanvas(); // Redraw to ensure drawing is updated and no highlight is left from drawing
});

canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
    hoveredX = null; // Reset hover cell position
    hoveredY = null;
    redrawCanvas(); // Ensure highlight is cleared when mouse leaves the canvas
});

document.getElementById('clear-btn').addEventListener('click', (event) => {
    event.preventDefault();
    clearCanvas();
});

document.getElementById('undo-btn').addEventListener('click', (event) => {
    event.preventDefault();
    undoLastAction();
});

document.getElementById('redo-btn').addEventListener('click', (event) => {
    event.preventDefault();
    redoLastAction();
});

document.getElementById('save-btn').addEventListener('click', (event) => {
    event.preventDefault();
    const imageUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'my-pixel-art.png';
    link.href = imageUrl;
    link.click();
});

document.querySelectorAll('#color-picker button').forEach(button => {
    button.addEventListener('click', () => {
        currentColor = button.style.backgroundColor;
        document.querySelectorAll('#color-picker button').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
    });
});

// Initialize the canvas with the default color without clearing pixels
redrawCanvas();
