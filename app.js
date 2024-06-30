class Action {
    constructor(type, coordinates, color, previousState) {
        this.type = type; // 'draw', 'clear', etc.
        this.coordinates = coordinates; // Array of {x, y}
        this.color = color; // The color used for the action
        this.previousState = previousState; // Previous color(s) before the action
    }
}

class UndoRedoManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    // Add a new action and clear the redo stack
    addAction(action) {
        this.undoStack.push(action);
        this.redoStack = [];
    }

    // Undo the last action
    undo(ctx, pixelSize) {
        if (this.undoStack.length > 0) {
            const action = this.undoStack.pop();
            this.applyAction(ctx, action, true, pixelSize); // Apply the action in reverse
            this.redoStack.push(action);
        }
    }

    // Redo the last undone action
    redo(ctx, pixelSize) {
        if (this.redoStack.length > 0) {
            const action = this.redoStack.pop();
            this.applyAction(ctx, action, false, pixelSize); // Reapply the action
            this.undoStack.push(action);
        }
    }

    // Apply or reverse an action
    applyAction(ctx, action, isUndo, pixelSize) {
        action.coordinates.forEach(coord => {
            const x = coord.x * pixelSize;
            const y = coord.y * pixelSize;
            const color = isUndo ? action.previousState[`${coord.x}_${coord.y}`] : action.color;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, pixelSize, pixelSize);
        });
    }
}

class DrawingApp {
    constructor(canvas, gridCanvas) {
        this.canvas = canvas;
        this.gridCanvas = gridCanvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.gridCtx = gridCanvas.getContext('2d', { willReadFrequently: true });
        this.isDrawing = false;
        this.lastPos = null;
        this.currentColor = '#0F0E0C';
        this.defaultCanvasColor = '#FCE184';
        this.gridVisible = false;
        this.initCanvas();
        this.initGridCanvas();
        this.attachEventListeners();
        this.highlightCanvas = document.getElementById('highlight-canvas');
        this.highlightCtx = this.highlightCanvas.getContext('2d');
        this.canvasRect = this.canvas.getBoundingClientRect(); // Cache the rect to avoid reflows
        this.pixelSize = this.canvas.width / 32; // Defines the resolution of the grid
        this.undoRedoManager = new UndoRedoManager();
    }

    compareImageData(imgData1, imgData2) {
        if (imgData1.width !== imgData2.width || imgData1.height !== imgData2.height) {
            return false;
        }
        for (let i = 0; i < imgData1.data.length; i++) {
            if (imgData1.data[i] !== imgData2.data[i]) {
                return false;
            }
        }
        return true;
    }

    initCanvas() {
        this.canvas.width = 3200;
        this.canvas.height = 3200;
        this.pixelSize = this.canvas.width / 32; // Assumes a 32x32 grid
        this.fillCanvas(this.defaultCanvasColor); // Fill the canvas with the default color

        // Draw the neck lines as part of the base template with the color #0F0E0C
        this.ctx.fillStyle = '#0F0E0C';

        // The left neck line, 7 grid cells high, should occupy the 11th column from the left edge, sitting on the bottom row.
        const leftNeckX = 10 * this.pixelSize; // 11th column (0-indexed so we use 10)
        const leftNeckHeight = 7 * this.pixelSize;

        // The right neck line should be 5 grid cells high and is positioned on the 16th column from the right of the canvas.
        const rightNeckX = (32 - 16) * this.pixelSize; // 16th column from the right
        const rightNeckHeight = 5 * this.pixelSize;

        // Draw left neck line (7 pixels high)
        for (let i = 0; i < 7; i++) {
            this.ctx.fillRect(leftNeckX, this.canvas.height - this.pixelSize - (i * this.pixelSize), this.pixelSize, this.pixelSize);
        }
        // Draw right neck line (5 pixels high)
        for (let i = 0; i < 5; i++) {
            this.ctx.fillRect(rightNeckX, this.canvas.height - this.pixelSize - (i * this.pixelSize), this.pixelSize, this.pixelSize);
        }

        // Set up a property to hold the neck line cells' coordinates for checking during drawing
        this.neckLineCells = new Set();
        for (let i = 0; i < 7; i++) {
            this.neckLineCells.add(`${leftNeckX / this.pixelSize}_${this.canvas.height / this.pixelSize - 1 - i}`);
        }
        for (let i = 0; i < 5; i++) {
            this.neckLineCells.add(`${rightNeckX / this.pixelSize}_${this.canvas.height / this.pixelSize - 1 - i}`);
        }
    }

    drawRect(x, y, color, size) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * size, y * size, size, size);
    }

    initGridCanvas() {
        this.gridCanvas.width = this.canvas.width;
        this.gridCanvas.height = this.canvas.height;
        this.gridCanvas.style.display = 'none';
        this.gridCanvas.style.pointerEvents = 'none';
    }

    fillCanvas(color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.redrawNeckLines(); // Ensure neck lines are redrawn every time the canvas is filled
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    redrawNeckLines() {
        // Draw the neck lines with the color #0F0E0C
        this.ctx.fillStyle = '#0F0E0C';

        const leftNeckX = 10 * this.pixelSize; // Left neck line position
        const rightNeckX = (32 - 16) * this.pixelSize; // Right neck line position

        for (let i = 0; i < 7; i++) { // 7 pixels high
            this.ctx.fillRect(leftNeckX, this.canvas.height - this.pixelSize - (i * this.pixelSize), this.pixelSize, this.pixelSize);
        }

        for (let i = 0; i < 5; i++) { // 5 pixels high
            this.ctx.fillRect(rightNeckX, this.canvas.height - this.pixelSize - (i * this.pixelSize), this.pixelSize, this.pixelSize);
        }
    }

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        this.gridCanvas.style.display = this.gridVisible ? 'block' : 'none';
        if (this.gridVisible) {
            this.drawGrid();
        }
    }

    drawGrid() {
        const gridSize = this.pixelSize;
        this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        this.gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.gridCtx.lineWidth = 10;

        for (let x = gridSize; x < this.gridCanvas.width; x += gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, this.gridCanvas.height);
            this.gridCtx.stroke();
        }

        for (let y = gridSize; y < this.gridCanvas.height; y += gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(this.gridCanvas.width, y);
            this.gridCtx.stroke();
        }
    }

    getMousePosition(event) {
        return {
            x: Math.floor((event.clientX - this.canvasRect.left) / (this.canvasRect.right - this.canvasRect.left) * this.canvas.width / this.pixelSize),
            y: Math.floor((event.clientY - this.canvasRect.top) / (this.canvasRect.bottom - this.canvasRect.top) * this.canvas.height / this.pixelSize)
        };
    }

    attachEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.highlightCell.bind(this));
        this.canvas.addEventListener('mousemove', this.keepDrawing.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseleave', this.clearHighlight.bind(this));

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.fillCanvas(this.defaultCanvasColor); // When clear button is clicked, fill the canvas with the default color
        });

        document.getElementById('show-grid-btn').addEventListener('click', this.toggleGrid.bind(this));

        document.querySelectorAll('#color-grid button').forEach(button => {
            button.addEventListener('click', (event) => {
                this.currentColor = event.target.style.backgroundColor;
                document.querySelectorAll('#color-grid button').forEach(btn => btn.classList.remove('selected'));
                event.target.classList.add('selected');
            });
        });

        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undoRedoManager.undo(this.ctx, this.pixelSize);
        });

        document.getElementById('redo-btn').addEventListener('click', () => {
            this.undoRedoManager.redo(this.ctx, this.pixelSize);
        });
    }

    highlightCell(event) {
        this.canvasRect = this.canvas.getBoundingClientRect(); // Update rect in case of page reflows
        const pos = this.getMousePosition(event);

        const pixelData = this.ctx.getImageData(pos.x * this.pixelSize, pos.y * this.pixelSize, 1, 1).data;

        const invertedColor = `rgb(${255 - pixelData[0]}, ${255 - pixelData[1]}, ${255 - pixelData[2]})`;

        this.clearHighlight();

        this.highlightCtx.strokeStyle = invertedColor;
        this.highlightCtx.lineWidth = 10;
        this.highlightCtx.strokeRect(pos.x * this.pixelSize, pos.y * this.pixelSize, this.pixelSize, this.pixelSize);
    }

    clearHighlight() {
        this.highlightCtx.clearRect(0, 0, this.highlightCanvas.width, this.highlightCanvas.height);
    }

    startDrawing(event) {
        this.isDrawing = true;
        const pos = this.getMousePosition(event);
        this.drawPixel(pos.x, pos.y);
    }

    keepDrawing(event) {
        if (!this.isDrawing) return;
        const pos = this.getMousePosition(event);
        const gridX = Math.floor(pos.x);
        const gridY = Math.floor(pos.y);

        if (this.lastPos) {
            this.drawLine(this.lastPos.x, this.lastPos.y, gridX, gridY);
        } else {
            this.drawPixel(gridX, gridY);
        }
        this.lastPos = { x: gridX, y: gridY };
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.lastPos = null;
        }
    }

    drawLine(x0, y0, x1, y1) {
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1;
        let sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;
        let e2;

        this.drawPixel(x0, y0);

        while (x0 !== x1 || y0 !== y1) {
            e2 = err * 2;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
            this.drawPixel(x0, y0);
        }
    }

    drawPixel(x, y) {
        if (!this.isNeckLineCell(x, y)) {
            const previousState = this.ctx.getImageData(x * this.pixelSize, y * this.pixelSize, 1, 1).data;
            const previousColor = `rgb(${previousState[0]}, ${previousState[1]}, ${previousState[2]})`;
            const action = new Action('draw', [{x, y}], this.currentColor, {[`${x}_${y}`]: previousColor});
            this.undoRedoManager.addAction(action);
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        }
    }

    isNeckLineCell(x, y) {
        return this.neckLineCells.has(`${x}_${y}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const gridCanvas = document.getElementById('grid-canvas');
    new DrawingApp(canvas, gridCanvas);
});
