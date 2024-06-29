let undoStack = [];
let redoStack = [];

function saveState() {
    undoStack.push(JSON.parse(JSON.stringify(window.drawApp.pixels)));
    redoStack = []; // Clear redo stack
}

function undoLastAction() {
    if (undoStack.length > 0) {
        redoStack.push(JSON.parse(JSON.stringify(window.drawApp.pixels)));
        window.drawApp.pixels = undoStack.pop();
    }
}

function redoLastAction() {
    if (redoStack.length > 0) {
        undoStack.push(JSON.parse(JSON.stringify(window.drawApp.pixels)));
        window.drawApp.pixels = redoStack.pop();
    }
}

document.getElementById('undo-btn').addEventListener('click', undoLastAction);
document.getElementById('redo-btn').addEventListener('click', redoLastAction);
