import { resolve } from 'path'

const { SerialPort } = require('serialport')

export default class SerialConnect {
  private static wait = null
  // 等待状态
  private static waitState: boolean = false
  // 连接状态
  private static connectState: boolean = false
  // 正确的下位机串口
  private static HardwarePort = {}
  // 连接硬件
  public static connectHardware = async (): Promise<boolean> => {
    if(this.connectState) return new Promise((resolve) => resolve(true))
    let portLists: Array<object> = []
    try {
      portLists = await SerialPort.list()
      // console.info(portLists)
    } catch (err) {
      console.info(err)
      this.connectState = false
      this.HardwarePort = {}
      return new Promise((resolve) => resolve(false))
    }
    if (portLists.length == 0) {
      console.info('no serial port')
      this.connectState = false
      return new Promise((resolve) => resolve(false))
    }
    // 连接硬件端口
    let connectCount = 3
    while (!this.connectState && connectCount > 0) {
      console.info(connectCount)
      // 遍历测试硬件连接
      for (let i = 0; i < portLists.length; i++) {
        let port = new SerialPort({path: portLists[i].path, baudRate: 115200 }, (err: Error) => {
          if (err) return this.errorHandle(err)
          console.log('port open success')
        })
        // console.info(port)
        // 以 flowing mode 监听收到的数据
        port.on('error', (err: Error) => {
          return this.errorHandle(err)
        })
        // 数据监听
        port.on('data', (buff) => {
          // 硬件应答连接
          if (buff[0] == 0xaa && buff[1] == 0xbb && buff[2] == 0xcc) {
            // 连接成功
            this.HardwarePort = port
            this.connectState = true
            return
          }
          // 处理数据
          this.dataHandle(buff)
        })
        // 窗口关闭监听
        port.on('close', () => {
          console.info('serial close listen')
          return this.errorHandle()
        })
        port.write(new Uint8Array([0xaa, 0xbb, 0xcc]))
        port.drain((err: Error) => {
          if (err) return this.errorHandle(err)
          console.info('send ok')
        })
        await new Promise((resolve) => setTimeout(resolve, 500))
        connectCount--
        // 如果没有连接就关闭
        if (!this.connectState) {
          this.HardwarePort = {}
          port.close((err: Error) => {
            if (err) return this.errorHandle(err)
            console.info('close success')
          })
        }
      }
    }
    if (this.connectState) {
      console.info('connect success')
      return new Promise((resolve) => resolve(true))
    } else {
      console.info('no hardware input')
      return new Promise((resolve) => resolve(false))
    }
  }
  // 错误处理
  private static errorHandle = async (err?: Error): Promise<boolean> => {
    // console.info(err)
    if (this.connectState) {
      this.HardwarePort?.close((err: Error) => {
        if (err) return this.errorHandle(err)
        console.info('close success')
      })
    }
    this.connectState = false
    this.HardwarePort = {}
    return new Promise((resolve) => resolve(false))
  }
  // 发送数据
  public static sendData = async (data: string): Promise<boolean> => {
    if (this.connectState && Object.keys(this.HardwarePort).length != 0) {
      this.HardwarePort?.write(Buffer.from(data))
      this.HardwarePort?.drain((err) => {
        if (err) return new Promise((resolve) => resolve(false))
        return new Promise((resolve) => resolve(true))
      })
      return new Promise((resolve) => resolve(true))
    }
    return new Promise((resolve) => resolve(false))
  }
  // 数据处理
  private static dataHandle = (buff: Buffer) => {
    if (buff[0] == 0x77) {
      // this.HardwarePort?.write(new Uint8Array([0xaa, 0xbb, 0x11]))
      this.waitState = true
      console.info('data send')
    }
  }
  // 等待回应
  public static waitSign = async (): Promise<boolean> => {
    await new Promise((resolve) =>
      this.wait = setInterval(() => {
        if (this.waitState) {
          clearInterval(this.wait)
          this.wait = null
          this.waitState = false
          resolve(true)
        }
      }, 1)
    ).catch(() => {
      return new Promise((resolve) => resolve(false))
    })
    return new Promise((resolve) => resolve(true))
  }
}
