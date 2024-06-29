function clearCanvas(init = false) {
    if (!init) saveState();
    pixels.forEach(row => row.fill('#FCE184'));
    redrawCanvas();
}

document.getElementById('clear-btn').addEventListener('click', (event) => {
    event.preventDefault();
    clearCanvas();
});

document.getElementById('save-btn').addEventListener('click', (event) => {
    event.preventDefault();
    const imageUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'my-pixel-art.png';
    link.href = imageUrl;
    link.click();
});
