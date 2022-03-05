import React, {useEffect, useRef, useState} from 'react'
import { flatten, get } from 'lodash';
import './App.css';

function App() {
  const canvasRef = useRef()
  const svgRef = useRef()
  const [ctx, setCtx] = useState()
  const [imageData, setImageData] = useState()
  const [referenceImageData, setReferenceImageData] = useState()
  const canvas = canvasRef.current
  const svg = svgRef.current
  const [circles, setCircles] = useState([])
  const colorFills = [['c', 'cyan'], ['m', 'magenta'], ['y', 'yellow'], ['k', 'black']]
  //  ___ ___ _____ _____ ___ _  _  ___ ___
  // / __| __|_   _|_   _|_ _| \| |/ __/ __|
  // \__ \ _|  | |   | |  | || .` | (_ \__ \
  // |___/___| |_|   |_| |___|_|\_|\___|___/

  const sampleDim = 40
  const maxDotRadius = sampleDim / 2
  //  _  _   _   _  _ ___  _    ___ ___
  // | || | /_\ | \| |   \| |  | __| _ \
  // | __ |/ _ \| .` | |) | |__| _||   /
  // |_||_/_/ \_\_|\_|___/|____|___|_|_\
  //

  function handleUpload(data){
    console.log(data.target.files)
    const fileReader = new FileReader()
    fileReader.addEventListener("load", (e) => {
      const img = new Image()
      console.log("img", img.width)
      img.addEventListener('load', ()=> {
        canvas.width = img.width
        canvas.height = img.height
        svg.setAttribute("height", img.height)
        svg.setAttribute("width", img.width)
        ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height)
        ctx.drawImage(img, 0, 0)
        const id = ctx.getImageData(0,0, img.width, img.height)
        setImageData(id)
        setReferenceImageData(id)
      })
      img.src = e.target.result
    })
    fileReader.readAsDataURL(data.target.files[0])
  }

  //Color at (x,y) position
  function getPixel(x,y){
    var color = {};
    color['r'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 0];
    color['g'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 1];
    color['b'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 2];
    color['a'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 3];
    return color
  }

  // returns a matrix of colors
  function getMatrix(x, y){
    const matrix = [...Array(sampleDim)].map(() => ([...Array(sampleDim)].map(() => 0)))
    if(x + sampleDim > imageData.width || y + sampleDim > imageData.height) return
    for(let i = 0; i < sampleDim; i++){
      for(let j = 0; j < sampleDim; j++){
        matrix[i][j] = convertRGBToCMYK(getPixel(x + i, y + j))
      }
    }

    return matrix
  }

  function averageChannelValueFromMatrix(matrix, channel){
    const flat = flatten(matrix)
    const total = flat.reduce((a, e) => a + e[channel], 0)
    const avg = total / flat.length
    return avg
  }

  function halfToneToSVG(){
    const circleList = []
    colorFills.forEach(([key, fill]) => {
      for(let x = 0; x < imageData.width - sampleDim; x +=sampleDim){
        for (let y = 0; y < imageData.height - sampleDim; y += sampleDim){
            const m = getMatrix(x,y)
            const avg = averageChannelValueFromMatrix(m, key)
            const circle = <circle key={`${x}.${y}`} r={maxDotRadius * avg} fill={fill} cx={x + maxDotRadius} cy={y+maxDotRadius}/>
            circleList.push(circle)
          }
        }
    })
    console.log(circleList)
    setCircles(circleList)
  }

  function convertRGBToCMYK(rgbaColorObject){
    const rRatio = rgbaColorObject.r / 255
    const gRatio = rgbaColorObject.g / 255
    const bRatio = rgbaColorObject.b / 255
    const k = 1 - Math.max(rRatio,gRatio,bRatio)
    const c = (1 - rRatio - k) / (1 - k)
    const m = (1 - gRatio - k) / (1 - k)
    const y = (1 - bRatio - k) / (1 - k)
    return {c,m,y,k}
  }


  function toImageDataIndex(x,y){
    return (y * imageData.width * 4) + (x*4)
  }

  // runs simple test
  function test(){
    halfToneToSVG()
    // console.log(convertRGBToCMYK({r: 0, g: 0, b: 255, a: 255}))
  }

  // draws a square at the location
  function drawSquareAt(x,y,size){
    const copyImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    for(let i = 0; i < size; i++){
      for(let j = 0; j < size; j++){
        if(i === 0 || j === 0 || i === size - 1 || j === size - 1){
          const pixelIndex = toImageDataIndex(x + i,y + j)
          copyImageData.data[pixelIndex] = 0
          copyImageData.data[pixelIndex + 1] = 0
          copyImageData.data[pixelIndex + 2] = 0
          copyImageData.data[pixelIndex + 3] = 0
        }
      }
    }
    setReferenceImageData(copyImageData)
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

  useEffect(()=> {
    if (referenceImageData) {
      ctx.putImageData(referenceImageData, 0, 0)
    }
  }, [referenceImageData])

  return (
    <div className="App">
      <div>
        <input type="file" id="fileUpload" onChange={handleUpload}/>
        <button onClick={()=> test()}>GetData</button>
      </div>
      <canvas className="canvas" ref={canvasRef}></canvas>
      <svg  className="svg canvas" ref={svgRef}>
        {circles}
      </svg>
    </div>
  );
}

export default App;
