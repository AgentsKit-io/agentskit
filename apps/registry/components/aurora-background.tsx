'use client'

import { useEffect, useRef } from 'react'

const vertexShader = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragmentShader = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_light;
  uniform vec3 u_accent;

  void main() {
    vec2 p = gl_FragCoord.xy / u_resolution.xy;
    p.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.15;
    float wave1 = sin(p.x * 2.0 + t) * 0.5 + 0.5;
    float wave2 = sin(p.y * 3.0 - t * 1.5 + wave1) * 0.5 + 0.5;
    float wave3 = sin((p.x + p.y) * 2.0 + t + wave2 * 2.0) * 0.5 + 0.5;

    vec3 bg = mix(vec3(0.051, 0.067, 0.090), vec3(1.0), u_light);
    vec3 auroraBlue = mix(vec3(0.345, 0.651, 1.0), vec3(0.035, 0.412, 0.855), u_light);
    vec3 auroraGreen = u_accent;
    vec3 currentLayer = mix(auroraBlue, auroraGreen, wave1);
    currentLayer = mix(currentLayer, auroraBlue, wave2 * 0.35 * (1.0 - u_light));

    float mask = smoothstep(0.4, 0.6, wave3);
    mask *= sin(p.y * 3.14) * 1.2;
    mask = clamp(mask, 0.0, 1.0);
    vec3 finalColor = mix(bg, currentLayer, mask * mix(0.4, 0.26, u_light));
    vec3 ambientColor = mix(auroraBlue, auroraGreen, u_light);
    finalColor += ambientColor * smoothstep(0.7, 1.0, wave2) * mix(0.2, 0.04 * mask, u_light);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Could not create aurora shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

export function AuroraBackground() {
  const gradientRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const gradient = gradientRef.current
    const canvas = canvasRef.current
    if (!gradient || !canvas) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let gl: WebGLRenderingContext | null = null
    let program: WebGLProgram | null = null
    let buffer: WebGLBuffer | null = null
    let timeUniform: WebGLUniformLocation | null = null
    let lightUniform: WebGLUniformLocation | null = null
    let accentUniform: WebGLUniformLocation | null = null
    let frame = 0
    let startTime = 0
    let lastFrame = 0
    let cleanupAurora = () => {}
    let themeObserver: MutationObserver | undefined

    const draw = (time: number) => {
      if (!gl || !program) return
      if (timeUniform) gl.uniform1f(timeUniform, time)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: 'low-power',
      })
      if (!gl) throw new Error('WebGL is unavailable')

      const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader)
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
      program = gl.createProgram()
      if (!program) throw new Error('Could not create aurora program')
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'Unknown shader link error')
      }

      gl.useProgram(program)
      timeUniform = gl.getUniformLocation(program, 'u_time')
      lightUniform = gl.getUniformLocation(program, 'u_light')
      accentUniform = gl.getUniformLocation(program, 'u_accent')
      buffer = gl.createBuffer()
      if (!buffer) throw new Error('Could not create aurora geometry')
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      )
      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

      const resolution = gl.getUniformLocation(program, 'u_resolution')
      const resize = () => {
        if (!gl || !resolution) return
        const scale = Math.min(window.devicePixelRatio || 1, 1.25)
        canvas.width = Math.round(window.innerWidth * scale)
        canvas.height = Math.round(window.innerHeight * scale)
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.uniform2f(resolution, canvas.width, canvas.height)
        draw((performance.now() - startTime) / 1000)
      }

      const render = (now: number) => {
        if (document.visibilityState === 'visible' && now - lastFrame >= 1000 / 30) {
          draw((now - startTime) / 1000)
          lastFrame = now
        }
        frame = window.requestAnimationFrame(render)
      }

      const syncTheme = () => {
        const isDark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark'
        gradient.dataset.theme = isDark ? 'dark' : 'light'
        canvas.style.opacity = isDark ? '' : '0.9'
        if (gl && lightUniform) gl.uniform1f(lightUniform, isDark ? 0 : 1)
        if (gl && accentUniform) {
          const accent = getComputedStyle(gradient).getPropertyValue('--ak-accent').trim()
          if (/^#[0-9a-f]{6}$/i.test(accent)) {
            gl.uniform3f(
              accentUniform,
              parseInt(accent.slice(1, 3), 16) / 255,
              parseInt(accent.slice(3, 5), 16) / 255,
              parseInt(accent.slice(5, 7), 16) / 255,
            )
          }
        }
        draw((performance.now() - startTime) / 1000)
      }

      startTime = performance.now()
      resize()
      syncTheme()
      themeObserver = new MutationObserver(syncTheme)
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
      window.addEventListener('resize', resize, { passive: true })
      gradient.dataset.shader = 'ready'
      if (!reducedMotion.matches) frame = window.requestAnimationFrame(render)

      const restoreFallback = () => { gradient.dataset.shader = 'fallback' }
      canvas.addEventListener('webglcontextlost', restoreFallback)

      cleanupAurora = () => {
        themeObserver?.disconnect()
        window.removeEventListener('resize', resize)
        canvas.removeEventListener('webglcontextlost', restoreFallback)
        window.cancelAnimationFrame(frame)
        if (gl && buffer) gl.deleteBuffer(buffer)
        if (gl && program) gl.deleteProgram(program)
      }
    } catch {
      gradient.dataset.shader = 'fallback'
    }

    return () => cleanupAurora()
  }, [])

  return (
    <div ref={gradientRef} className="ak-aurora-background" data-aurora-background="" aria-hidden="true">
      <canvas ref={canvasRef} className="ak-aurora-background__canvas" />
    </div>
  )
}
