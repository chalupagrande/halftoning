import React, { useEffect, useRef, useState } from 'react'
import ReactDOMServer from 'react-dom/server'
import FileSaver from 'file-saver';
import JSZip from 'jszip';
import {
  getMatrix,
  averageChannelValueFromMatrix,
  getRotatedImage,
} from '../../lib/utils'
import { Button, Divider, InputNumber, Slider, Space, Switch } from 'antd'
import 'antd/dist/antd.min.css';
import './App.css';
import Settings from '../Settings/Settings';
import { layers as normalLayers, inverseLayers, layerOrder } from '../Settings/defaults'

const zip = new JSZip()

const curDefaults = {
  printerDivisionSizeY: 237,
  printerDivisionSizeX: 186,
  // size of a posterboard
  realY: 559,
  realX: 711
}


function App() {
  const canvasRef = useRef()
  const svgRef = useRef()
  const svg = svgRef.current
  const [showSettings, setShowSettings] = useState(false)
  const [image, setImage] = useState()
  const canvas = canvasRef.current
  const [ctx, setCtx] = useState()
  const [groups, setGroups] = useState([])
  //  ___ ___ _____ _____ ___ _  _  ___ ___
  // / __| __|_   _|_   _|_ _| \| |/ __/ __|
  // \__ \ _|  | |   | |  | || .` | (_ \__ \
  // |___/___| |_|   |_| |___|_|\_|\___|___/
  const [sampleDim, setSampleDim] = useState(10)
  const [showOriginal, setShowOriginal] = useState(false)
  const [greyScale, setGreyScale] = useState(true)
  const [isRect, setIsRect] = useState(true)
  const [finalPieceWidthInMM, setFinalPieceHeightInMM] = useState(curDefaults.realX)
  const [printableWidth, setPrintableWidth] = useState(curDefaults.printerDivisionSizeX)
  const [printableHeight, setPrintableHeight] = useState(curDefaults.printerDivisionSizeY)
  const [previewChopsGroups, setPreviewChopsGroups] = useState(false)
  const [smallestShapeInMM, setSmallestShapeInMM] = useState(1)
  const [overlapInMM, setOverlap] = useState(20)
  const appRef = useRef()


  //      ___   _   _    ___ _   _ _      _ _____ ___ ___   __   ___   _   _   _ ___ ___ 
  //     / __| /_\ | |  / __| | | | |    /_\_   _| __|   \  \ \ / /_\ | | | | | | __/ __|
  //    | (__ / _ \| |_| (__| |_| | |__ / _ \| | | _|| |) |  \ V / _ \| |_| |_| | _|\__ \
  //     \___/_/ \_\____\___|\___/|____/_/ \_\_| |___|___/    \_/_/ \_\____\___/|___|___/

  const shapeOptions = ["circle", "rect"]
  // const sampleDim = 7 // number of pixels to use
  const shape = isRect ? shapeOptions[1] : shapeOptions[0]
  // if circle, max size is sampleDim / 2 (because it uses radius)
  const maxDotSize = shape === shapeOptions[0] ? sampleDim / 2 : sampleDim
  const invert = false
  const layers = invert ? inverseLayers : normalLayers
  const widthInPx = ctx?.canvas?.width || 0
  const heightInPx = ctx?.canvas?.height || 0
  const finalPieceHeightInMM = finalPieceWidthInMM * heightInPx / widthInPx
  const pixelsPerMMX = widthInPx / finalPieceWidthInMM
  const pixelsPerMMY = heightInPx / finalPieceHeightInMM
  const effectivePrintableWidthInMM = printableWidth - overlapInMM
  const effectivePrintableHeightInMM = printableHeight - overlapInMM
  const effectivePrintableWidthInPxX = effectivePrintableWidthInMM * pixelsPerMMX
  const effectivePrintableWidthInPxY = effectivePrintableHeightInMM * pixelsPerMMY
  const smallestShapeInPx = smallestShapeInMM * pixelsPerMMX

  const printableWidthInPx = printableWidth * pixelsPerMMX
  const printableHeightInPx = printableHeight * pixelsPerMMY
  const numXChops = Math.ceil(widthInPx / effectivePrintableWidthInPxX)
  const numYChops = Math.ceil(heightInPx / effectivePrintableWidthInPxY)
  const overlapInPxX = overlapInMM * pixelsPerMMX
  const overlapInPxY = overlapInMM * pixelsPerMMY

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
    // reset image
    getRotatedImage(image, ctx, 0)
    setGroups(groups)
  }


  function halftoneLayer(ctx, key, fill, rotation, xTranslate, yTranslate) {
    const { width, height } = ctx.canvas
    const imageData = ctx.getImageData(0, 0, width, height)
    const shapes = []

    for (let x = 0; x < width - sampleDim; x += sampleDim) {
      for (let y = 0; y < height - sampleDim; y += sampleDim) {
        const m = getMatrix(imageData, x, y, sampleDim)
        const avg = averageChannelValueFromMatrix(m, key) || 0
        let sizeFactor = (maxDotSize * avg)
        let shapeToAdd;
        if (sizeFactor && sizeFactor > smallestShapeInPx) {
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

          shapes.push(shapeToAdd)
        }
      }
    }
    return <g style={{
      transform: `rotate(${-rotation}deg) translate(${-xTranslate}px, ${-yTranslate}px)`
    }} key={key} data-index={key}>{shapes}</g>
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
          const startX = x * printableWidthInPx - (overlapInPxX * x)
          const startY = y * printableHeightInPx - (overlapInPxY * y)
          const head = `<svg id="saving-svg" title="halftone" version="1.1" xmlns="http://www.w3.org/2000/svg" width="${printableWidthInPx}" height="${printableHeightInPx}" viewBox="${startX} ${startY} ${printableWidthInPx} ${printableHeightInPx}" style="
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
              x > printableWidthInPx ||
              y + shapeHeight < 0 ||
              y > printableHeightInPx
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
          const color = (x + y) % 2 === 0 ? "red" : "blue"
          const xPos = x * printableWidthInPx - (overlapInPxX * x)
          const yPos = y * printableHeightInPx - (overlapInPxY * y)
          chopSquares.push(<rect key={`${x}.${y}`} stroke={color} strokeWidth={1} fill="none" x={xPos} y={yPos} width={printableWidthInPx} height={printableHeightInPx} />)
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
          <h3 className="underline">Halftone Settings</h3>
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
          <div>
            <label>smallest shape (mm)</label>
            <InputNumber onChange={setSmallestShapeInMM} value={smallestShapeInMM} />
          </div>
        </Space>
        <Divider type='vertical' />
        <Space direction='vertical'>
          <h3 className="underline">Printer Settings</h3>
          <div>
            <label>Real World Width (mm)</label>
            <InputNumber onChange={setFinalPieceHeightInMM} value={finalPieceWidthInMM} />
          </div>
          <div>
            <label>Real World Height (mm)</label>
            <InputNumber value={finalPieceHeightInMM} />
          </div>
          <div>
            <label>Printable Width (mm)</label>
            <InputNumber onChange={setPrintableWidth} value={printableWidth} />
          </div>
          <div>
            <label>Printable Height (mm)</label>
            <InputNumber onChange={setPrintableHeight} value={printableHeight} />
          </div>
          <div>
            <label>Overlap (mm)</label>
            <InputNumber onChange={setOverlap} value={overlapInMM} />
          </div>
        </Space>
        <Divider type="vertical" />
        <Space direction='vertical'>

          <h4>Chop Size X (px): {printableWidthInPx}</h4>
          <h4>Chop Size Y (px): {printableHeightInPx}</h4>
          <h4>Num X Chops: {numXChops}</h4>
          <h4>Num Y Chops: {numYChops}</h4>
          <h4>Width / Height px: {widthInPx} x {heightInPx}</h4>

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
      <svg className="svg" width={widthInPx} height={heightInPx} ref={svgRef} viewBox={`0 0 ${widthInPx} ${heightInPx}`}>
        {groups}
        {previewChopsGroups}
      </svg>

    </div>
  );
}

export default App;
