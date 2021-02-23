import "../css/main.css";

const TAU = Math.PI * 2.0;
const PI2 = Math.PI / 2.0;

const arc = (cx, cy, angle, scale, data) => {
    const v = Math.max(50 * scale, Math.min(200 * scale, data * scale));
    return { x: cx + v * Math.cos(angle), y: cy + v * Math.sin(angle) };
};

const renderWave = (context, scale, data) => {
    const cx = context.canvas.width / 2.0;
    const cy = context.canvas.height / 2.0;
    const step = TAU / data.length;
    const { x, y } = arc(cx, cy, PI2, scale, data[0]);
    context.beginPath();
    context.moveTo(x, y);
    for (let i = 1; i < data.length; ++i) {
        const { x, y } = arc(cx, cy, (PI2 + i * step), scale, data[i]);
        context.lineTo(x, y);
    }
    context.stroke();
};

const createCanvas = (canvas, scale, colors) => {
    const context = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const gradient = context.createRadialGradient(cx, cy, scale, cx, cy, scale * 5);
    gradient.addColorStop(0.00, colors[0]);
    gradient.addColorStop(0.25, colors[1]);
    gradient.addColorStop(0.50, colors[2]);
    gradient.addColorStop(0.75, colors[3]);
    gradient.addColorStop(1.00, colors[4]);
    return { context, gradient };
};

const zoomOut = (context, speed = 1) => {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const aspect = width / height;
    const sx = speed * 1.1 * aspect;
    const sy = speed * 1.1;
    context.drawImage(context.canvas, sx, sy, width - sx * 2.0, height - sy * 2.0, 0, 0, width, height);
};

function Analyzer(audioElement) {
    const audioCtx = new AudioContext();
    const sourceNode = audioCtx.createMediaElementSource(audioElement);
    const analyser = audioCtx.createAnalyser();
    sourceNode.connect(analyser);
    sourceNode.connect(audioCtx.destination);
    analyser.smoothingTimeConstant = 0.6;
    analyser.fftSize = 512;
    const timeDomainData = new Uint8Array(analyser.fftSize);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    return {
        get timeDomainData() {
            analyser.getByteTimeDomainData(timeDomainData)
            return timeDomainData;
        },
        get frequencyData() {
            analyser.getByteFrequencyData(frequencyData)
            return frequencyData;
        }
    }
}

const run = () => {
    let analyser;
    let playing = false;

    const audio = document.querySelector("audio");
    audio.addEventListener("ended", e => {
        e.target.classList.remove("shrink");
        playing = false;
    });

    document.querySelector(".play").addEventListener("click", async e => {
        e.target.classList.add("shrink");
        analyser = analyser || Analyzer(audio);
        await audio.play();
        playing = true;
    })

    const canvas = document.querySelector("canvas");
    canvas.width = canvas.clientWidth >> 1;
    canvas.height = canvas.clientHeight >> 1;
    const lineColors = ["#112233", "#FFFF33", "#FF4411", "#334488", "#55FFFF"];
    const { context, gradient } = createCanvas(canvas, 30, lineColors);

    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = canvas.width >> 2;
    blurCanvas.height = canvas.height >> 2;
    const blurColors = ["#001133", "#FFFF11", "#FF4400", "#112288", "#22FFFF"];
    const { context: blurContext, gradient: blurGradient } = createCanvas(blurCanvas, 7.5, blurColors);

    const render = () => {
        context.fillStyle = "rgba(0, 0, 0, 0.04)";
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (playing) {
            zoomOut(context, 1);

            blurContext.lineWidth = 0.25;
            blurContext.strokeStyle = blurGradient;
            blurContext.clearRect(0, 0, blurContext.canvas.width, blurContext.canvas.height);
            renderWave(blurContext, 0.1875, analyser.timeDomainData);

            context.filter = "blur(2px)";
            context.drawImage(blurCanvas, 0, 0, canvas.width, canvas.height);
            context.filter = "";

            context.lineWidth = 2.0;
            context.strokeStyle = gradient;
            renderWave(context, 0.75, analyser.timeDomainData);

        }

        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
};

window.addEventListener("load", () => run(), { once: true });
