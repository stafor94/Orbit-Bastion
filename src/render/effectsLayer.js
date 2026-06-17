(function () {
  "use strict";

  class WebGLEffectsLayer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
      this.program = null;
      this.timeLoc = null;
      this.pulseLoc = null;
      this.resolutionLoc = null;
      this.ready = false;
      this.init();
    }

    init() {
      const gl = this.gl;
      if (!gl) return;
      const vertex = `
        attribute vec2 a;
        void main(){ gl_Position = vec4(a, 0.0, 1.0); }
      `;
      const fragment = `
        precision mediump float;
        uniform float uTime;
        uniform float uPulse;
        uniform vec2 uResolution;
        float scan(vec2 uv) {
          return smoothstep(0.94, 1.0, sin((uv.y + uTime * 0.22) * 620.0) * 0.5 + 0.5);
        }
        void main() {
          vec2 uv = gl_FragCoord.xy / uResolution;
          float vignette = smoothstep(0.88, 0.14, distance(uv, vec2(0.5)));
          float s = scan(uv) * 0.08;
          float alert = uPulse * (0.15 + 0.18 * sin(uTime * 18.0));
          vec3 color = vec3(0.07, 0.55, 0.9) * s + vec3(1.0, 0.08, 0.12) * alert;
          gl_FragColor = vec4(color, (s + alert) * vignette);
        }
      `;
      const vs = this.shader(gl.VERTEX_SHADER, vertex);
      const fs = this.shader(gl.FRAGMENT_SHADER, fragment);
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.program = program;
      this.timeLoc = gl.getUniformLocation(program, "uTime");
      this.pulseLoc = gl.getUniformLocation(program, "uPulse");
      this.resolutionLoc = gl.getUniformLocation(program, "uResolution");
      this.ready = true;
    }

    shader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    resize() {
      if (!this.gl) return;
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    render(time, pulse) {
      const gl = this.gl;
      if (!this.ready || !gl) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(this.program);
      const loc = gl.getAttribLocation(this.program, "a");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(this.timeLoc, time);
      gl.uniform1f(this.pulseLoc, pulse);
      gl.uniform2f(this.resolutionLoc, this.canvas.width, this.canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }


  window.WebGLEffectsLayer = WebGLEffectsLayer;
})();
