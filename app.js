class DrawingApp {
    constructor(canvas, gridCanvas, maxHistory = 100) {
        this.canvas = canvas;
        this.gridCanvas = gridCanvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.gridCtx = gridCanvas.getContext('2d', { willReadFrequently: true });
        this.isDrawing = false;
        this.lastPos = null;
        this.currentColor = '#0F0E0C';
        this.defaultCanvasColor = '#FCE184';
        this.gridVisible = false;
        this.history = []; // Operation history
        this.redoHistory = []; // Operations that can be redone
        this.maxHistory = maxHistory;
        this.initCanvas();
        this.initGridCanvas();
        this.attachEventListeners();
        this.highlightCanvas = document.getElementById('highlight-canvas');
        this.highlightCtx = this.highlightCanvas.getContext('2d');
        this.canvasRect = this.canvas.getBoundingClientRect(); // Cache the rect to avoid reflows
        this.pixelSize = this.canvas.width / 32; // Defines the resolution of the grid
        this.currentStateIndex = -1;
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

        // Save the initial state with the neck lines
        this.history.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
        this.currentStateIndex = 0;

        // Set up a property to hold the neck line cells' coordinates for checking during drawing
        this.neckLineCells = new Set();
        for (let i = 0; i < 7; i++) {
            this.neckLineCells.add(`${leftNeckX / this.pixelSize}_${this.canvas.height / this.pixelSize - 1 - i}`);
        }
        for (let i = 0; i < 5; i++) {
            this.neckLineCells.add(`${rightNeckX / this.pixelSize}_${this.canvas.height / this.pixelSize - 1 - i}`);
        }
    }


    // Helper function to draw rectangles on the canvas
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

    // Redraw the entire canvas based on the history of operations
    redraw() {
        this.clearCanvas(); // Clears the entire canvas
        this.fillCanvas(this.defaultCanvasColor); // Fill canvas with the default color
        this.redrawNeckLines(); // Redraw the static neck lines

        // Redraw all operations from the history
        for (const op of this.history) {
            this.redrawOperation(op);
        }
    }


    // Redraw a single operation
    redrawOperation(op) {
        if (op.type === 'line') {
            this.drawLine(op.x0, op.y0, op.x1, op.y1);
        } else if (op.type === 'pixel') {
            this.drawPixel(op.x, op.y);
        }
        // Handle other types of operations as needed
    }

    // Clear the canvas
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
        // Adjust calculations for the current canvas size and position
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
            this.saveState();
        });
        document.getElementById('undo-btn').addEventListener('click', this.undo.bind(this));
        document.getElementById('redo-btn').addEventListener('click', this.redo.bind(this));
        document.getElementById('show-grid-btn').addEventListener('click', this.toggleGrid.bind(this));

        document.querySelectorAll('#color-grid button').forEach(button => {
            button.addEventListener('click', (event) => {
                this.currentColor = event.target.style.backgroundColor;
                document.querySelectorAll('#color-grid button').forEach(btn => btn.classList.remove('selected'));
                event.target.classList.add('selected');
            });
        });
    }

    highlightCell(event) {
        this.canvasRect = this.canvas.getBoundingClientRect(); // Update rect in case of page reflows
        const pos = this.getMousePosition(event);

        // Get the color data of the current pixel
        const pixelData = this.ctx.getImageData(pos.x * this.pixelSize, pos.y * this.pixelSize, 1, 1).data;

        // Invert the color
        const invertedColor = `rgb(${255 - pixelData[0]}, ${255 - pixelData[1]}, ${255 - pixelData[2]})`;

        // Clear the previous highlight
        this.clearHighlight();

        // Set the stroke style to the inverted color and highlight the cell
        this.highlightCtx.strokeStyle = invertedColor;
        this.highlightCtx.lineWidth = 10;
        this.highlightCtx.strokeRect(pos.x * this.pixelSize, pos.y * this.pixelSize, this.pixelSize, this.pixelSize);
    }

    clearHighlight() {
        this.highlightCtx.clearRect(0, 0, this.highlightCanvas.width, this.highlightCanvas.height);
    }

    // startDrawing and keepDrawing now use grid coordinates
    startDrawing(event) {
        this.isDrawing = true;
        const pos = this.getMousePosition(event);
        this.drawPixel(pos.x, pos.y);
    }

    // Use requestAnimationFrame for drawing operations
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
            this.saveState();
        }
    }


    // Interpolate and draw lines strictly within grid cells
    drawLine(x0, y0, x1, y1) {
        // Calculate the difference between the points
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1;
        let sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;
        let e2;

        // Draw initial pixel
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
            // Draw pixel at the new position
            this.drawPixel(x0, y0);
        }
    }

    // Draw a pixel only if it's not on the neck lines and only within the grid
    drawPixel(x, y) {
        if (!this.isNeckLineCell(x, y)) {
            // Save the operation instead of the whole canvas
            this.lastOperation = {
                type: 'pixel',
                x,
                y,
                color: this.currentColor
            };
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        }
    }



    // Add the logic in the isNeckLineCell function
    isNeckLineCell(x, y) {
        // Check if the cell's coordinates are in the set of neck line cells
        return this.neckLineCells.has(`${x}_${y}`);
    }



    saveState() {
        // Debounce saveState to run only after drawing has finished
        if (!this.isDrawing && !this.saveStateTimeout) {
            this.saveStateTimeout = setTimeout(() => {
                this.actualSaveState();
                clearTimeout(this.saveStateTimeout);
                this.saveStateTimeout = null;
            }, 500); // Adjust time for throttle as necessary
        }
    }

    actualSaveState() {
        if (this.lastOperation) {
            this.history.push(this.lastOperation);
            this.currentStateIndex++;
            this.lastOperation = null;

            // Limit history length
            while (this.history.length > this.maxHistory) {
                this.history.shift();
                this.currentStateIndex--;
            }
        }
    }


    // Optimize drawPixel to minimize redrawing
    drawPixel(gridX, gridY) {
        // Only draw if we're currently drawing and it's not a neck line cell
        if (this.isDrawing && !this.isNeckLineCell(gridX, gridY)) {
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fillRect(gridX * this.pixelSize, gridY * this.pixelSize, this.pixelSize, this.pixelSize);
        }
    }

    undo() {
        if (this.currentStateIndex >= 0) {
            // Removing the last operation from the history
            const lastOp = this.history.pop();

            // Adding it to the redo history
            this.redoHistory.push(lastOp);

            // Decrementing the currentStateIndex
            this.currentStateIndex--;

            // Redrawing all operations except the last one
            this.redraw();
        }
    }



    redo() {
        if (this.redoHistory.length > 0) {
            // Getting the last operation from the redoHistory
            const operation = this.redoHistory.pop();

            // Adding it back to the history
            this.history.push(operation);

            // Incrementing the currentStateIndex
            this.currentStateIndex++;

            // Redrawing the operation that was just added back
            this.redrawOperation(operation);
        }
    }


}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const gridCanvas = document.getElementById('grid-canvas');
    new DrawingApp(canvas, gridCanvas);
});