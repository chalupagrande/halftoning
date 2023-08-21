import React, { useState } from 'react'

import { Drawer, Form, Input, InputNumber, Select, Switch } from 'antd'
import { layers as ls } from './defaults'
import ColorInput from './ColorInput'
import './Settings.css'

function Settings({ visible, close }) {
  const [layers, setLayers] = useState(ls)

  const formLayout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 20 }
  }

  function handleClose() {
    close()
  }

  return (
    <Drawer visible={visible} onClose={handleClose}>
      <div className="settings">
        <Form size='small' {...formLayout}>
          <Form.Item
            name="invert"
            label="Invert"
          >
            <Switch checked={true} />
          </Form.Item>
          <Form.Item
            name="dotType"
            label="Dot Type"
          >
            <Select>
              <Select.Option value="circle">Circle</Select.Option>
              <Select.Option value="square">Square</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="dpi"
            label="Image DPI"
          >
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="printWidth"
            label="Final Width"
          >
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="printHeight"
            label="Final Height"
          >
            <InputNumber />
          </Form.Item>
          <h3>Colors</h3>
          <Form.Item
            name="cyan"
            label="Cyan"
          >
            <ColorInput />
          </Form.Item>
          <Form.Item
            name="magenta"
            label="Magenta"
          >
            <ColorInput />
          </Form.Item>
          <Form.Item
            name="yellow"
            label="Yellow"
          >
            <ColorInput />
          </Form.Item>
          <Form.Item
            name="black"
            label="Black"
          >
            <ColorInput />
          </Form.Item>
        </Form>
      </div>
    </Drawer>
  )
}

export default Settings