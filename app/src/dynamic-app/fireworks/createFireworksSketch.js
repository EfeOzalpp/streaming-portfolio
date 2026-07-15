import { adjustHexBrightness, getUsablePalette } from './color';
import {
  getExplosionTarget,
  getLaunchSpeed,
  getParticleCount,
  getParticleLifespanRange,
  getSpeedMultiplier,
  getViewportBand,
} from './layout';

const FIREWORKS_BACKGROUND = '#1e1e1f';

function getBlinkingParticleSpeed(p, size) {
  if (size >= 1 && size < 2) return p.random(0.5, 2.7);
  if (size >= 2 && size < 3) return p.random(2.5, 4.7);
  if (size >= 3 && size < 4) return p.random(4.5, 6.7);
  if (size >= 4 && size < 5) return p.random(6.5, 8.7);
  if (size >= 5 && size < 6) return p.random(8.5, 8.7);
  if (size >= 6 && size < 7) return p.random(8.8, 9);
  if (size >= 7 && size < 8) return p.random(9.1, 9.2);
  if (size >= 8 && size < 9) return p.random(9.2, 9.3);
  return p.random(9.4, 9.5);
}

function getProjectileParticleSpeed(p, size) {
  if (size >= 1 && size < 7) return p.random(1, 9);
  if (size >= 7 && size < 9) return p.random(8, 9);
  if (size >= 10 && size < 12) return p.random(9, 9.2);
  return p.random(1, 4);
}

function getGravityForce(p, size) {
  if (size >= 1 && size < 2) return p.random(-0.151, -0.161);
  if (size >= 2 && size < 3) return p.random(-0.146, -0.156);
  if (size >= 3 && size < 4) return p.random(-0.144, -0.145);
  if (size >= 4 && size < 5) return p.random(-0.141, -0.143);
  if (size >= 5 && size < 6) return p.random(-0.139, -0.14);
  if (size >= 6 && size < 7) return p.random(-0.137, -0.138);
  if (size >= 7 && size < 8) return p.random(-0.135, -0.136);
  if (size >= 8 && size < 9) return p.random(-0.134, -0.136);
  if (size <= 9) return p.random(-0.135, -0.137);
  return p.random(-0.094, -0.137);
}

export function createFireworksSketch({
  fireworksRef,
  fireworksEnabledRef,
  hiddenDurationRef,
  latestItems,
  latestColorMapping,
  isRealMobileRef,
  canvasRef,
}) {
  return (p) => {
    // Size the canvas to its actual container, not the full browser window --
    // in the embedded/shadow context the container is the small device-mockup
    // frame, not the page viewport, so windowWidth/windowHeight would give the
    // canvas a mismatched aspect ratio and CSS (width/height:100%) would then
    // stretch the raster to fit, distorting it.
    const getContainerSize = () => {
      const el = canvasRef?.current;
      return {
        w: el?.clientWidth || p.windowWidth,
        h: el?.clientHeight || p.windowHeight,
      };
    };

    let fireworks = fireworksRef.current;
    let lastFireworkTime = 0;
    let fireworkToggle = true;
    let nextFireworkDelay = p.random(5300, 8000);

    class Particle {
      constructor(x, y, c, firework, size, type, hasTrail = false) {
        this.pos = p.createVector(x, y);
        this.vel = firework
          ? p.createVector(0, p.random(-10, -20))
          : p.createVector(p.random(-1, 1), p.random(-1, 1)).mult(p.random(0, 18));
        this.acc = p.createVector(0, 0);
        this.col = this.adjustBrightness(
          c,
          size > 10 ? p.random(1.4, 2) : size > 5 ? p.random(1.1, 1.3) : p.random(0.7, 1.1)
        );
        this.firework = firework;
        this.size = size;
        this.type = type;
        this.hasTrail = hasTrail;
        this.shapeType = p.random(['circle', 'square', 'triangle']);

        const band = getViewportBand(p.windowWidth);
        const lifespanRange = getParticleLifespanRange(p, band);

        this.lifespan = p.map(size, 1, 12, lifespanRange.min, lifespanRange.max);
        this.trailLength = size >= 4 && size <= 12 ? 8 : 1;
        this.trail = Array(this.trailLength).fill(p.createVector(x, y));

        const initialSpeed = this.vel.mag();
        this.trailLifespan = Array(this.trailLength).fill(p.map(initialSpeed, 0, 20, 0, 100));
        this.fadeFactor = p.map(size, 1, 15, 0.6, 0.5);
        this.blinkingSpeed = firework ? 0 : p.random(5, 30);
        this.blinkingAlpha = 255;
      }

      adjustBrightness(baseColor, multiplier) {
        const r = Math.min(255, Math.max(0, baseColor.levels[0] * multiplier));
        const g = Math.min(255, Math.max(0, baseColor.levels[1] * multiplier));
        const b = Math.min(255, Math.max(0, baseColor.levels[2] * multiplier));
        return p.color(r, g, b);
      }

      applyForce(force) {
        this.acc.add(force);
      }

      update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);

        if (!this.firework) {
          this.vel.mult(0.927);
          this.lifespan = Math.max(0, this.lifespan - this.fadeFactor);

          if (this.hasTrail) {
            this.trail.pop();
            this.trail.unshift(this.pos.copy());
            for (let i = 0; i < this.trailLifespan.length; i++) {
              this.trailLifespan[i] = Math.max(0, this.trailLifespan[i] - this.fadeFactor);
            }
          }

          this.applyForce(p.createVector(0, getGravityForce(p, this.size)));
        }

        if (!this.firework && this.type === 'BLINKING') {
          this.blinkingAlpha = Math.abs(255 * Math.sin((p.millis() / 1000) * this.blinkingSpeed));
        }
      }

      show() {
        const alpha = this.firework
          ? p.map(this.lifespan, 0, 255, 0, 255)
          : this.type === 'BLINKING'
            ? this.blinkingAlpha
            : p.map(this.lifespan, 0, 255, 0, 255);

        p.noStroke();

        let shrinkSize = this.size;
        if (!this.firework) {
          const elapsedTime = p.map(this.lifespan, 255, 0, 0, 5);
          const shrinkFactor = elapsedTime <= 2 ? 1 : p.map(this.lifespan, 255, 0, 1, 0);
          shrinkSize = this.size * (1 - Math.pow(1 - shrinkFactor, 6));
        }

        const normalizedSize = Math.max(shrinkSize * 1.1, 1);
        const rotationAngle = p.atan2(this.vel.y, this.vel.x);

        if (this.hasTrail) {
          for (let i = 0; i < this.trail.length; i++) {
            const trailAlpha = this.trailLifespan[i];
            if (trailAlpha <= 0) continue;

            const trailSize = this.firework ? this.size * 0.9 : this.size * 0.8;
            p.strokeWeight(trailSize);
            p.stroke(this.col.levels[0], this.col.levels[1], this.col.levels[2], trailAlpha);
            p.point(this.trail[i].x, this.trail[i].y);
          }
        }

        p.push();
        p.translate(this.pos.x, this.pos.y);
        p.rotate(rotationAngle);
        p.rotate(p.frameCount * this.vel.mag() * 0.01);
        p.fill(this.col.levels[0], this.col.levels[1], this.col.levels[2], alpha);

        if (this.shapeType === 'circle') {
          p.ellipse(0, 0, normalizedSize, normalizedSize);
        } else if (this.shapeType === 'square') {
          const halfSize = normalizedSize / 2;
          p.rect(-halfSize, -halfSize, normalizedSize, normalizedSize);
        } else {
          const halfSize = normalizedSize / 2;
          p.triangle(0, -halfSize, -halfSize, halfSize, halfSize, halfSize);
        }

        p.pop();
      }

      isDone() {
        return this.lifespan <= 0;
      }
    }

    class Firework {
      constructor(x, y, col, type) {
        this.firework = new Particle(x, y, col, true, 4, type);
        this.particles = [];
        this.exploded = false;
        this.col = col;
        this.type = type;
        this.explosionStartTime = -1;

        const band = getViewportBand(p.windowWidth);
        const target = getExplosionTarget(p, band);
        this.targetX = target.x;
        this.targetY = target.y;
        this.numParticles = getParticleCount(p, band, type);
      }

      explode() {
        const initialVel = this.firework.vel.copy();
        const largerParticleCount =
          this.type === 'PROJECTILE' ? Math.floor(p.random(25, 50)) : 0;

        for (let i = 0; i < this.numParticles; i++) {
          const size =
            this.type === 'PROJECTILE' && i < largerParticleCount
              ? p.random(10, 12)
              : this.type === 'BLINKING'
                ? p.random(1, 9)
                : p.random(1, 8);

          const band = getViewportBand(p.windowWidth);
          const speedBase =
            this.type === 'BLINKING'
              ? getBlinkingParticleSpeed(p, size)
              : getProjectileParticleSpeed(p, size);
          const speed = speedBase * getSpeedMultiplier(p, band);

          const angle = p.random(p.TWO_PI);
          const velocity = p.createVector(p.cos(angle), p.sin(angle)).mult(speed);
          const angleDiff = Math.abs(
            p.atan2(velocity.y, velocity.x) - p.atan2(initialVel.y, initialVel.x)
          );
          const velocityMultiplier =
            angleDiff < p.HALF_PI / 4 ? p.random(0, 0.5) : p.random(0.5, 0.8);

          velocity.add(initialVel.copy().mult(velocityMultiplier));

          const particle = new Particle(
            this.firework.pos.x + p.random(-2, 6),
            this.firework.pos.y + p.random(-2, 6),
            this.col,
            false,
            size,
            'BLINKING',
            size > 6
          );

          particle.vel = velocity;
          this.particles.push(particle);
        }

        this.exploded = true;
        this.explosionStartTime = p.millis();
      }

      update() {
        if (!this.exploded) {
          const direction = p.createVector(
            this.targetX - this.firework.pos.x,
            this.targetY - this.firework.pos.y
          );
          direction.normalize();
          direction.mult(getLaunchSpeed(p, getViewportBand(p.windowWidth)));
          this.firework.vel = direction;
          this.firework.update();

          if (p.dist(this.firework.pos.x, this.firework.pos.y, this.targetX, this.targetY) < 10) {
            this.explode();
          }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
          const particle = this.particles[i];
          particle.applyForce(p.createVector(0, 0.16));
          particle.update();
          if (particle.isDone()) {
            this.particles.splice(i, 1);
          }
        }
      }

      show() {
        if (!this.exploded) {
          this.firework.show();
        }

        for (const particle of this.particles) {
          particle.show();
        }
      }
    }

    function addNewFirework(type) {
      const usableColors = getUsablePalette(latestItems.current, latestColorMapping.current);
      if (usableColors.length === 0) return;

      const randomHex = usableColors[Math.floor(p.random(usableColors.length))];
      const adjustedHex = adjustHexBrightness(randomHex, p.random(1, 1.4));
      fireworks.push(new Firework(p.width / 2, p.height, p.color(adjustedHex), type));
    }

    p.setup = () => {
      const { w, h } = getContainerSize();
      p.createCanvas(w, h);
      addNewFirework(Math.random() < 0.65 ? 'BLINKING' : 'PROJECTILE');
      lastFireworkTime = p.millis();
      hiddenDurationRef.current = 0;
    };

    p.draw = () => {
      // Opaque p.background() painted into the canvas's own pixels every
      // frame is what was covering the title/nav on real mobile/tablet
      // WebKit (see shadowObserver-adjacent fix history). Desktop never had
      // that bug and wants the solid backdrop, so only go transparent on
      // compact viewports; trails are handled explicitly per-particle either
      // way, so this doesn't change the visual effect itself.
      if (window.innerWidth <= 1024) {
        p.clear();
      } else {
        p.background(FIREWORKS_BACKGROUND);
      }

      if (!fireworksEnabledRef.current) {
        fireworksRef.current.length = 0;
        return;
      }

      for (const firework of fireworks) {
        firework.update();
        firework.show();
      }

      const adjustedTime = p.millis() - hiddenDurationRef.current;

      if (adjustedTime < lastFireworkTime) {
        lastFireworkTime = adjustedTime - nextFireworkDelay - 1;
      }

      if (adjustedTime - lastFireworkTime > nextFireworkDelay) {
        addNewFirework(fireworkToggle ? 'BLINKING' : 'PROJECTILE');
        fireworkToggle = !fireworkToggle;
        lastFireworkTime = adjustedTime;
        nextFireworkDelay = p.random(6700, 13300);
      }
    };

    p.windowResized = () => {
      const { w, h } = getContainerSize();
      const widthChanged = Math.abs(w - p.width) > 2;
      const heightShrankModestly = p.height - h > 0 && p.height - h < 120;
      // Mobile browsers commonly fire a resize shortly after initial load as
      // the URL bar/toolbar chrome collapses, shrinking window.innerHeight by
      // a modest amount with no width change and no real layout shift.
      // resizeCanvas() resets the canvas, which kills whatever firework was
      // mid-flight -- only actually resize on a real width change or a large
      // height change (genuine orientation/layout shift), not this.
      if (!widthChanged && heightShrankModestly) return;
      p.resizeCanvas(w, h);
    };
  };
}
