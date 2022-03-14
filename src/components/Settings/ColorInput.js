import React, {useState} from 'react'
import { Input, InputNumber, Space} from 'antd'

function ColorInput({label, onChange, placeholder}){
  const [state, setState] = useState({
    angle: 0,
    color: ''
  })

  function handleAngleChange(v){
    const newState = {...state, angle: v}
    setState(newState)
    onChange(newState)
  }

  function handleColorChange(e){
    const newState = {...state, color: e.target.value}
    setState(newState)
    onChange(newState)
  }

  return (
    <Space direction='horizontal'>
      <InputNumber name="angle" placeholder="angle" onChange={handleAngleChange}/>
      <Input name="color" placeholder="fill" onChange={handleColorChange}/>
    </Space>
  )
}

export default ColorInput