class ConfettiController {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.active = false;
    this.lastTime = 0;
    this.duration = 3200;
    this.gravity = 0.25;
    this.colors = ['#ff4655', '#ff7a2f', '#ffe066', '#ff99ac'];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  spawn(count = 180) {
    const { innerWidth: width, innerHeight: height } = window;
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: width / 2,
        y: height + Math.random() * 60,
        vx: (Math.random() - 0.5) * 18,
        vy: -Math.random() * 18 - 12,
        size: Math.random() * 8 + 6,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.25,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        life: this.duration,
        shape: Math.random() > 0.4 ? 'square' : 'ribbon',
      });
    }
  }

  burst() {
    this.active = true;
    this.particles = [];
    this.lastTime = performance.now();
    this.spawn();
    this.loop(this.lastTime);
  }

  loop(timestamp) {
    if (!this.active) return;
    const delta = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.update(delta);
    this.draw();
    if (this.particles.length === 0) {
      this.active = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    requestAnimationFrame((time) => this.loop(time));
  }

  update(delta) {
    const { innerWidth: width, innerHeight: height } = window;
    const deltaSeconds = delta / 1000;
    this.particles = this.particles.filter((particle) => {
      const p = particle;
      p.vy += this.gravity * deltaSeconds * 60;
      p.x += p.vx * deltaSeconds * 60;
      p.y += p.vy * deltaSeconds * 60;
      p.angle += p.spin * deltaSeconds * 60;
      p.life -= delta;
      return p.y < height + 120 && p.life > 0;
    });

    if (this.particles.length < 90) {
      this.spawn(40);
    }
  }

  draw() {
    const { innerWidth: width, innerHeight: height } = window;
    this.ctx.clearRect(0, 0, width, height);
    this.particles.forEach((particle) => {
      this.ctx.save();
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.angle);
      this.ctx.fillStyle = particle.color;
      if (particle.shape === 'square') {
        this.ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      } else {
        const gradient = this.ctx.createLinearGradient(0, -particle.size, 0, particle.size);
        gradient.addColorStop(0, `${particle.color}cc`);
        gradient.addColorStop(0.5, `${particle.color}88`);
        gradient.addColorStop(1, `${particle.color}22`);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(-particle.size / 4, -particle.size, particle.size / 2, particle.size * 2);
      }
      this.ctx.restore();
    });
  }
}

window.ConfettiController = ConfettiController;
