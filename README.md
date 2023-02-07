# ⚡️ state-share

Real-time topics and services for web apps using Socket.io and Zod, inspired by ROS
Meant for use in low-latency interactive applications to share state on local networks
### Features
- Typed and validated topics and services via Zod
  ```typescript
  const SensorTopic = createTopic("sensor", z.object({
    "temperature": z.number(),
    "humidity": z.number()
  }))
  client.pub(SensorTopic, {temperature: 20, humidity: "50%"}) // Error: Expected number, received string
  ```
- Collaborative topics
  ```typescript
  client1.pub(channel, {a: "1"})
  client2.pub(channel, {b: "2"})
  client3.sub(channel, (value) => {
    console.log(value) // {a: "1", b: "2"}
  })
  ```
- Async service calls
  ```typescript
  const AdditionService = createService("add", 
    // Request schema
    z.object({
      "a": z.number(),
      "b": z.number()
    }), 
    // Response schema
    z.number()
  )
  ...

  // Call service
  const result = await client.call(AdditionService, {a: 1, b: 2}) // Promise<number>
  ```
- Packagable channels for easy sharing between client and server
  ```typescript
  export const AdditionService = createService("add", 
    z.object({
      "a": z.number(),
      "b": z.number()
    }), 
    z.number()
  )

  export const SensorTopic = createTopic("sensor", z.object({
    "temperature": z.number(),
    "humidity": z.number()
  }))
  ...

  // Client and server can share the same channels from an external package
  import {AdditionService, SensorTopic} from "channels"
  ```