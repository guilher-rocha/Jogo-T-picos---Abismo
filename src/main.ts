const canvas = document.getElementById('screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = 800;
canvas.height = 480;
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
