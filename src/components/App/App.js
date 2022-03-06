import React, {useEffect, useRef, useState} from 'react'
import FileSaver from 'file-saver';
import {
  getMatrix,
  averageChannelValueFromMatrix,
  getRotatedImage,
} from '../../lib/utils'
import './App.css';

function App() {
  const canvasRef = useRef()
  const svgRef = useRef()
  const [image, setImage] = useState()
  const canvas = canvasRef.current
  const [ctx, setCtx] = useState()
  const svg = svgRef.current
  const [groups, setGroups] = useState([])
  //  ___ ___ _____ _____ ___ _  _  ___ ___
  // / __| __|_   _|_   _|_ _| \| |/ __/ __|
  // \__ \ _|  | |   | |  | || .` | (_ \__ \
  // |___/___| |_|   |_| |___|_|\_|\___|___/
  console.log("RENDER")

  const sampleDim = 6
  const maxDotRadius = sampleDim / 2
  const layers = {
    c: {rotation: 345, fill: "cyan"},
    m: {rotation: 15, fill: "magenta"},
    y: {rotation: 0, fill: 'yellow'},
    k: {rotation: 75, fill: 'black'}
  }
  //  _  _   _   _  _ ___  _    ___ ___
  // | || | /_\ | \| |   \| |  | __| _ \
  // | __ |/ _ \| .` | |) | |__| _||   /
  // |_||_/_/ \_\_|\_|___/|____|___|_|_\
  //

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
    console.log("DONE!!")
  }

  function halftoneLayer(ctx, key, fill, rotation, xTranslate, yTranslate){
    const {width, height} = ctx.canvas
    const imageData = ctx.getImageData(0,0, width, height)
    const circles = []
    for(let x = 0; x < width - sampleDim; x +=sampleDim){
      for (let y = 0; y < height - sampleDim; y += sampleDim){
          const m = getMatrix(imageData, x, y, sampleDim, key === 'k')
          const avg = averageChannelValueFromMatrix(m, key) || 0
          const radius = maxDotRadius * avg
          if(radius){
            const circle = <circle
              key={`${key}-${x}.${y}`}
              r={radius}
              fill={fill}
              cx={x + maxDotRadius/2}
              cy={y+maxDotRadius/2}/>
            circles.push(circle)
          }
        }
      }
    return <g style={{
      transform: `rotate(${-rotation}deg) translate(${-xTranslate}px, ${-yTranslate}px)`
    }} key={key} data-index={key}>{circles}</g>
  }

  function save(){
    const svg_data = svgRef.current.innerHTML
    const head = '<svg title="graph" version="1.1" xmlns="http://www.w3.org/2000/svg">'
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
      <div>
        <input type="file" id="fileUpload" onChange={handleUpload}/>
        <button onClick={halftoneSVG}>Halftone</button>
        <button onClick={save}>Save Halftone</button>
      </div>
      <canvas className="canvas" ref={canvasRef}></canvas>
      <svg  className="svg canvas" ref={svgRef}>
        {groups}
      </svg>
    </div>
  );
}

export default App;


//  _  _ ___ _    ___ ___ ___  ___
// | || | __| |  | _ \ __| _ \/ __|
// | __ | _|| |__|  _/ _||   /\__ \
// |_||_|___|____|_| |___|_|_\|___/
