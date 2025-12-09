// Type declarations to fix React 19 and React Native type compatibility
// React 19 includes 'bigint' in ReactNode, but React Native components don't support it
// This file patches the types to make them compatible

import 'react'
import 'react-native'

declare module 'react' {
  // Override ReactNode to exclude bigint for React Native compatibility
  namespace React {
    type ReactNode =
      | ReactElement
      | string
      | number
      | Iterable<ReactNode>
      | ReactPortal
      | boolean
      | null
      | undefined
  }
}

// Fix React Native component types to work with React 19
declare module 'react-native' {
  import { Component } from 'react'

  // Make React Native components compatible with React 19's Component type
  interface ComponentClass<P = {}, S = {}> extends Component<P, S> {
    new (props: P, context?: any): Component<P, S>
  }
}
