import React, { useEffect, useRef, useState } from 'react'
import ReactDOMServer from 'react-dom/server'
import FileSaver from 'file-saver';
import JSZip from 'jszip';
import {
  getMatrix,
  averageChannelValueFromMatrix,
  getRotatedImage,
  changeCanvasAspectRatio
} from '../../lib/utils'
import { Button, Divider, InputNumber, Slider, Space, Switch } from 'antd'
import 'antd/dist/antd.min.css';
import './App.css';
import Settings from '../Settings/Settings';
import { layers as normalLayers, inverseLayers, layerOrder } from '../Settings/defaults'

const zip = new JSZip()

const curDefaults = {
  printerDivisionSizeY: 237,
  printerDivisionSizeX: 186.33,
  realY: 559,
  realX: 711
}


function App() {
  const canvasRef = useRef()
  const svgRef = useRef()
  const [showSettings, setShowSettings] = useState(false)
  const [image, setImage] = useState()
  const canvas = canvasRef.current
  const [ctx, setCtx] = useState()
  const svg = svgRef.current
  const [groups, setGroups] = useState([])
  const [sampleDim, setSampleDim] = useState(10)
  const [showOriginal, setShowOriginal] = useState(true)
  const [greyScale, setGreyScale] = useState(false)
  const [isRect, setIsRect] = useState(false)
  const [realWorldWidth, setRealWorldWidth] = useState(curDefaults.realX)
  const [printerWidth, setPrinterWidth] = useState(curDefaults.printerDivisionSizeX)
  const [printerHeight, setPrinterHeight] = useState(curDefaults.printerDivisionSizeY)
  const [previewChopsGroups, setPreviewChopsGroups] = useState(false)
  const [smallestShape, setSmallestShape] = useState(0.3)
  const appRef = useRef()
  //  ___ ___ _____ _____ ___ _  _  ___ ___
  // / __| __|_   _|_   _|_ _| \| |/ __/ __|
  // \__ \ _|  | |   | |  | || .` | (_ \__ \
  // |___/___| |_|   |_| |___|_|\_|\___|___/

  const shapeOptions = ["circle", "rect"]
  // const sampleDim = 7 // number of pixels to use
  const shape = isRect ? shapeOptions[1] : shapeOptions[0]
  const maxDotSize = shape === shapeOptions[0] ? sampleDim / 2 : sampleDim
  const invert = false
  const layers = invert ? inverseLayers : normalLayers
  const width = ctx?.canvas?.width || 0
  const height = ctx?.canvas?.height || 0

  const realWorldHeight = realWorldWidth * height / width
  const numXChops = realWorldWidth / printerWidth
  const numYChops = realWorldHeight / printerHeight
  const chopSizeInPixelsX = (width && numXChops ? width / numXChops : 0).toFixed(2)
  const chopSizeInPixelsY = (height && numYChops ? height / numYChops : 0).toFixed(2)


  //  _  _   _   _  _ ___  _    ___ ___
  // | || | /_\ | \| |   \| |  | __| _ \
  // | __ |/ _ \| .` | |) | |__| _||   /
  // |_||_/_/ \_\_|\_|___/|____|___|_|_\
  //

  function handleShowSettings() {
    setShowSettings(!showSettings)
  }


  function handleUpload(data) {
    const fileReader = new FileReader()
    fileReader.addEventListener("load", (e) => {
      const img = new Image()
      img.addEventListener('load', () => {
        canvas.width = img.width
        canvas.height = img.height

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        ctx.drawImage(img, 0, 0)
      })
      img.src = e.target.result
      setImage(img)
    })
    fileReader.readAsDataURL(data.target.files[0])

  }

  function handleSVGUpload(data) {
    const fileReader = new FileReader()
    fileReader.addEventListener("load", (e) => {
      console.log(e.target.result)
      const b64 = e.target.result.split(",")[1]
      console.log(b64)
      const svgData = atob(b64)
      svgRef.current.innerHTML = svgData
    })
    fileReader.readAsDataURL(data.target.files[0])

  }


  function halftoneSVG() {
    // loop over layers
    const { width, height } = ctx.canvas
    const groups = []
    let sortedEntries = Object.entries(layers).sort((a, b) => {
      return layerOrder.indexOf(a[0]) - layerOrder.indexOf(b[0])
    })
    if (greyScale) {
      sortedEntries = sortedEntries.filter(([key]) => key === "k")
    }
    for (let [key, { rotation, fill }] of sortedEntries) {
      const { xOrigin: xTranslate, yOrigin: yTranslate } = getRotatedImage(image, ctx, rotation)
      const g = halftoneLayer(ctx, key, fill, rotation, xTranslate, yTranslate)
      groups.push(g)
    }
    if (invert) {
      groups.unshift(<g className="background">
        <rect
          key="background"
          x={0}
          y={0}
          width={width}
          height={height} />
      </g>)
    }
    // reset image
    getRotatedImage(image, ctx, 0)
    setGroups(groups)
  }


  function halftoneLayer(ctx, key, fill, rotation, xTranslate, yTranslate) {
    const { width, height } = ctx.canvas
    const imageData = ctx.getImageData(0, 0, width, height)
    const circles = []

    for (let x = 0; x < width - sampleDim; x += sampleDim) {
      for (let y = 0; y < height - sampleDim; y += sampleDim) {
        const m = getMatrix(imageData, x, y, sampleDim)
        const avg = averageChannelValueFromMatrix(m, key) || 0
        let sizeFactor = (maxDotSize * avg)
        // TODO: figure out how to invert
        if (key === "w" && avg === 1) continue
        let shapeToAdd;
        if (sizeFactor && sizeFactor > smallestShape) {
          sizeFactor = sizeFactor.toFixed(4)
          if (shape === 'circle') {
            shapeToAdd = <circle
              key={`${key}-${x}.${y}`}
              r={sizeFactor}
              fill={fill}
              cx={x + maxDotSize / 2}
              cy={y + maxDotSize / 2} />
          } else {
            shapeToAdd = <rect
              key={`${key}-${x}.${y}`}
              width={sizeFactor}
              height={sizeFactor}
              fill={fill}
              x={x}
              y={y} />
          }

          circles.push(shapeToAdd)
        }
      }
    }
    return <g style={{
      transform: `rotate(${-rotation}deg) translate(${-xTranslate}px, ${-yTranslate}px)`
    }} key={key} data-index={key}>{circles}</g>
  }

  function handleWidthUpdate(v) {
    setRealWorldWidth(v)

  }

  function handlePrinterWidthUpdate(v) {
    setPrinterWidth(v)
  }

  function handlePrinterHeightUpdate(v) {
    setPrinterHeight(v)
  }

  function save() {
    const svg_data = svgRef.current.innerHTML
    const w = image.width
    const h = image.height
    const head = `<svg title="graph" version="1.1" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`
    const style = "<style></style>"
    const full_svg = head + style + svg_data + "</svg>"
    const blob = new Blob([full_svg], { type: "image/svg+xml" });
    FileSaver.saveAs(blob, "halftone.svg");
  }

  async function saveChopped() {
    const folder = zip.folder("chopped-svg")

    let sortedEntries = Object.entries(layers).sort((a, b) => {
      return layerOrder.indexOf(a[0]) - layerOrder.indexOf(b[0])
    })
    if (greyScale) {
      sortedEntries = sortedEntries.filter(([key]) => key === "k")
    }
    for (let [key, { rotation, fill }] of sortedEntries) {
      const { xOrigin: xTranslate, yOrigin: yTranslate } = getRotatedImage(image, ctx, rotation)
      const g = halftoneLayer(ctx, key, fill, rotation, xTranslate, yTranslate)
      for (let y = 0; y < numYChops; y++) {
        for (let x = 0; x < numXChops; x++) {
          const startX = x * chopSizeInPixelsX
          const startY = y * chopSizeInPixelsY
          const head = `<svg id="saving-svg" title="halftone" version="1.1" xmlns="http://www.w3.org/2000/svg" width="${chopSizeInPixelsX}" height="${chopSizeInPixelsY}" viewBox="${startX} ${startY} ${chopSizeInPixelsX} ${chopSizeInPixelsY}" style="
                          position: absolute;
                          top: 0;
                          left:  0;
                        ">`
          const full_svg = head + ReactDOMServer.renderToString(g) + "</svg>"
          // append svg to dom
          appRef.current.innerHTML += full_svg
          const saving = document.getElementById("saving-svg")
          const savingShapes = saving.querySelectorAll(shape)
          savingShapes.forEach((shape) => {
            const { x, y, width: shapeWidth, height: shapeHeight } = shape.getBoundingClientRect()
            if (
              x + shapeWidth < 0 ||
              x > chopSizeInPixelsX ||
              y + shapeHeight < 0 ||
              y > chopSizeInPixelsY
            ) {
              shape.remove()
            }
          })

          const newFullSvg = head + saving.innerHTML + "</svg>"
          saving.remove()

          const blob = new Blob([newFullSvg], { type: "image/svg+xml" });
          folder.file(`${key}-chop-${x}-${y}.svg`, blob)
        }
      }
    }

    folder.generateAsync({ type: 'blob' }).then(function (content) {
      FileSaver.saveAs(content, 'chopped-svg.zip');
    });
  }

  function previewChops(shouldShow) {
    if (shouldShow) {
      const chopSquares = []
      for (let y = 0; y < numYChops; y++) {
        for (let x = 0; x < numXChops; x++) {
          chopSquares.push(<rect key={`${x}.${y}`} stroke="red" strokeWidth={1} fill="none" x={x * chopSizeInPixelsX} y={y * chopSizeInPixelsY} width={chopSizeInPixelsX} height={chopSizeInPixelsY} />)
        }
      }
      const chopGroup = <g key="chops" className="chops">{chopSquares}</g>

      setPreviewChopsGroups(chopGroup)
    } else {
      setPreviewChopsGroups(false)
    }
  }


  //  _    ___ ___ _____ ___ _  _ ___ ___  ___
  // | |  |_ _/ __|_   _| __| \| | __| _ \/ __|
  // | |__ | |\__ \ | | | _|| .` | _||   /\__ \
  // |____|___|___/ |_| |___|_|\_|___|_|_\|___/

  useEffect(() => {
    if (canvasRef?.current) {
      const context = canvasRef.current.getContext("2d")
      setCtx(context)
    }
  }, [canvasRef])

  return (
    <div className="App" ref={appRef}>
      <Space direction='horizontal' style={{ display: 'flex', justifyContent: "space-between" }}>
        <Space direction='vertical'>
          <div>
            <label>Sample Size: <strong>{sampleDim}</strong></label>
            <Slider onChange={(v) => setSampleDim(v)} value={sampleDim} min={3} max={100} />
          </div>
          <div>
            <label>Show Original</label>
            <Switch checked={showOriginal} onChange={setShowOriginal} />
          </div>
          <div>
            <label>GreyScale</label>
            <Switch checked={greyScale} onChange={setGreyScale} />
          </div>
          <div>
            <label>Use Rectangles</label>
            <Switch checked={isRect} onChange={setIsRect} />
          </div>
        </Space>
        <Divider type='vertical' />
        <Space direction='vertical'>
          <h4>Printer Settings</h4>
          <div>
            <label>Real World Width (mm)</label>
            <InputNumber onChange={handleWidthUpdate} value={realWorldWidth} />
          </div>
          <div>
            <label>Real World Height (mm)</label>
            <InputNumber value={realWorldHeight} />
          </div>
          <div>
            <label>Num X Chops</label>
            <InputNumber value={numXChops} disabled />
          </div>
          <div>
            <label>Num Y Chops</label>
            <InputNumber value={numYChops} disabled />
          </div>
          <div>
            <label>Printer Width (mm)</label>
            <InputNumber onChange={handlePrinterWidthUpdate} value={printerWidth} />
          </div>
          <div>
            <label>Printer Height (mm)</label>
            <InputNumber onChange={handlePrinterHeightUpdate} value={printerHeight} />
          </div>
          <div>
            <label>smallest shape (px)</label>
            <InputNumber onChange={setSmallestShape} value={smallestShape} />
          </div>
        </Space>
        <Divider type="vertical" />
        <Space direction='vertical'>

          <h4>Chop Size X (px): {chopSizeInPixelsX}</h4>
          <h4>Chop Size Y (px): {chopSizeInPixelsY}</h4>
          <h4>Width / Height px: {width} x {height}</h4>

          <label>Show Chops Preview</label>
          <Switch checked={!!previewChopsGroups} onChange={previewChops} />
        </Space>
      </Space>
      <Divider />
      <div>
        <Space>
          <label htmlFor="fileUpload">Upload Image</label>
          <input type="file" id="fileUpload" onChange={handleUpload} />
          <Button type="primary" onClick={() => halftoneSVG()}>Process Halftone</Button>
          <Button type="primary" onClick={save}>Save Halftone SVG</Button>
          <Button type="primary" onClick={saveChopped}>Save Chopped SVG</Button>
        </Space>
        {/* <label htmlFor="fileUpload">Upload SVG</label>
        <input type="file" id="fileUpload" onChange={handleSVGUpload} /> */}
      </div>
      <Divider />
      <canvas className="canvas" style={{ display: showOriginal ? "block" : "none" }} ref={canvasRef}></canvas>
      <svg className="svg" width={width} height={height} ref={svgRef} viewBox={`0 0 ${width} ${height}`}>
        {groups}
        {previewChopsGroups}
      </svg>

    </div>
  );
}

export default App;
