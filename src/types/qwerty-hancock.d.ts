declare module 'qwerty-hancock' {
  interface QwertyHancockOptions {
    id?: string;
    element?: HTMLElement;
    width?: number;
    height?: number;
    octaves?: number;
    startNote?: string;
    whiteKeyColour?: string;
    blackKeyColour?: string;
    activeColour?: string;
    hoverColour?: string;
    borderColour?: string;
    keyboardLayout?: 'en' | 'de';
  }

  class QwertyHancock {
    constructor(options?: QwertyHancockOptions);
    keyDown: (note: string, frequency: number) => void;
    keyUp: (note: string, frequency: number) => void;
  }

  export default QwertyHancock;
}
