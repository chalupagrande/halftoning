import React, {useEffect, useRef, useState} from 'react'
import FileSaver from 'file-saver';
import {
  getMatrix,
  averageChannelValueFromMatrix,
  getRotatedImage,
} from '../../lib/utils'
import {Button, Space} from 'antd'
import 'antd/dist/antd.min.css';
import './App.css';
import Settings from '../Settings/Settings';
import {layers as layerSettings} from '../Settings/defaults'

function App() {
  const canvasRef = useRef()
  const svgRef = useRef()
  const [showSettings, setShowSettings] = useState(false)
  const [image, setImage] = useState()
  const canvas = canvasRef.current
  const [ctx, setCtx] = useState()
  const svg = svgRef.current
  const [groups, setGroups] = useState([])
  const [layers, setLayers] = useState(layerSettings)
  console.log("LAYERS", layers)
  //  ___ ___ _____ _____ ___ _  _  ___ ___
  // / __| __|_   _|_   _|_ _| \| |/ __/ __|
  // \__ \ _|  | |   | |  | || .` | (_ \__ \
  // |___/___| |_|   |_| |___|_|\_|\___|___/

  const sampleDim = 15 // number of pixels to use
  const shape = "circle"
  const maxDotSize = shape === "circle" ? sampleDim / 2 : sampleDim
  const maxPrintDotSize = 1 // in inches
  const printWidth = 10
  const printHeight = 12
  const bufferInDots = 1
  const dpiOfImage = 72


  //  _  _   _   _  _ ___  _    ___ ___
  // | || | /_\ | \| |   \| |  | __| _ \
  // | __ |/ _ \| .` | |) | |__| _||   /
  // |_||_/_/ \_\_|\_|___/|____|___|_|_\
  //

  function handleShowSettings(){
    setShowSettings(!showSettings)
  }

  function handleUpload(data){
    const fileReader = new FileReader()
    fileReader.addEventListener("load", (e) => {
      const img = new Image()
      img.addEventListener('load', ()=> {
        canvas.width = img.width
        canvas.height = img.height
        svg.setAttribute("height", img.height)
        svg.setAttribute("width", img.width)

        ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height)
        ctx.drawImage(img, 0, 0)
      })
      img.src = e.target.result
      setImage(img)

    })
    fileReader.readAsDataURL(data.target.files[0])
  }


  function halftoneSVG(){
    // loop over layers
    const groups = []
    for(let [key, {rotation, fill}] of Object.entries(layers)){
      const {xOrigin: xTranslate, yOrigin: yTranslate} = getRotatedImage(image, ctx, rotation)
      const g = halftoneLayer(ctx, key, fill, rotation, xTranslate, yTranslate)
      groups.push(g)
    }
    // reset image
    getRotatedImage(image, ctx, 0)
    setGroups(groups)
  }

  // function split(){
  //   const sampleW =
  // }

  function halftoneLayer(ctx, key, fill, rotation, xTranslate, yTranslate){
    const {width, height} = ctx.canvas
    const imageData = ctx.getImageData(0,0, width, height)
    const circles = []
    for(let x = 0; x < width - sampleDim; x +=sampleDim){
      for (let y = 0; y < height - sampleDim; y += sampleDim){
          const m = getMatrix(imageData, x, y, sampleDim, key === 'k')
          const avg = averageChannelValueFromMatrix(m, key) || 0
          let sizeFactor = (maxDotSize * avg)
          let shapeToAdd;
          if(sizeFactor){
            // sizeFactor = sizeFactor.toFixed(4)
            if(shape === 'circle') {
              shapeToAdd = <circle
              key={`${key}-${x}.${y}`}
              r={sizeFactor}
              fill={fill}
              cx={x + maxDotSize/2}
              cy={y + maxDotSize/2}/>
            } else {
              shapeToAdd = <rect
              key={`${key}-${x}.${y}`}
              width={sizeFactor}
              height={sizeFactor}
              fill={fill}
              x={x}
              y={y}/>
            }

            circles.push(shapeToAdd)
          }
        }
      }
    return <g style={{
      transform: `rotate(${-rotation}deg) translate(${-xTranslate}px, ${-yTranslate}px)`
    }} key={key} data-index={key}>{circles}</g>
  }

  function save(){
    const svg_data = svgRef.current.innerHTML
    const w = image.width
    const h = image.height
    const head = `<svg title="graph" version="1.1" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`
    const style = "<style></style>"
    const full_svg = head +  style + svg_data + "</svg>"
    const blob = new Blob([full_svg], {type: "image/svg+xml"});
    FileSaver.saveAs(blob, "halftone.svg");
  }

  //  _    ___ ___ _____ ___ _  _ ___ ___  ___
  // | |  |_ _/ __|_   _| __| \| | __| _ \/ __|
  // | |__ | |\__ \ | | | _|| .` | _||   /\__ \
  // |____|___|___/ |_| |___|_|\_|___|_|_\|___/

  useEffect(()=> {
    if (canvasRef?.current) {
      const context = canvasRef.current.getContext("2d")
      setCtx(context)
    }
  }, [canvasRef])

  return (
    <div className="App">
      <Button onClick={handleShowSettings}>Settings</Button>
      <Settings visible={showSettings} close={handleShowSettings}/>
      <div>
        <input type="file" id="fileUpload" onChange={handleUpload}/>
        <Space>
        <Button type="primary" onClick={halftoneSVG}>Process Halftone</Button>
        <Button type="primary" onClick={save}>Save Halftone SVG</Button>
        </Space>
      </div>
      <canvas className="canvas" ref={canvasRef}></canvas>
      <svg  className="svg canvas" ref={svgRef}>
        {groups}
      </svg>
    </div>
  );
}

export default App;
