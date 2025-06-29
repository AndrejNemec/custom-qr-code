import type { RequiredOptions } from "./QROptions";
import errorCorrectionPercents from "./constants/errorCorrectionPercents";
import gradientTypes from "./constants/gradientTypes";
import QRCornerDot from "./figures/cornerDot/svg/QRCornerDot";
import QRCornerSquare from "./figures/cornerSquare/svg/QRCornerSquare";
import QRDot from "./figures/dot/svg/QRDot";
import calculateImageSize from "./tools/calculateImageSize";
import type { FilterFunction, Gradient, QRCode } from "./types";

const squareMask = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const dotMask = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];

export default class QRSVG {
  static _id = 0;

  _id: number;
  _element: SVGElement;
  _style: SVGStyleElement;
  _defs: SVGElement;
  _dotsClipPath?: SVGElement;
  _cornersSquareClipPath?: SVGElement;
  _cornersDotClipPath?: SVGElement;
  _dots?: SVGElement;
  _cornerSquares?: SVGElement;
  _corners?: SVGElement;
  _cornerDots?: SVGElement;
  _options: RequiredOptions;
  _qr?: QRCode;
  _image?: HTMLImageElement;

  //TODO don't pass all options to this class
  constructor(options: RequiredOptions) {
    this._id = QRSVG._id++;
    this._element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._element.setAttribute("width", String(options.width));
    this._element.setAttribute("height", String(options.height));
    this._element.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    this._element.setAttribute("data-internal-uid", this.id);
    this._defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    this._style = document.createElementNS("http://www.w3.org/2000/svg", "style");

    this._options = options;
  }

  get width(): number {
    return this._options.width;
  }

  get height(): number {
    return this._options.height;
  }

  get id(): string {
    return `svg_qr_${this._id}`;
  }

  getElement(): SVGElement {
    return this._element;
  }

  clear(): void {
    const oldElement = this._element;
    this._element = oldElement.cloneNode(false) as SVGElement;
    oldElement?.parentNode?.replaceChild(this._element, oldElement);
    this._defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    this._style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    this._element.appendChild(this._style);
    this._element.appendChild(this._defs);
  }

  async drawQR(qr: QRCode): Promise<void> {
    const count = qr.getModuleCount();
    const minSize = Math.min(this._options.width, this._options.height) - this._options.margin * 2;
    const dotSize = Math.floor(minSize / count);
    let drawImageSize = {
      hideXDots: 0,
      hideYDots: 0,
      width: 0,
      height: 0,
    };

    this._qr = qr;

    if (this._options.image) {
      //We need it to get image size
      await this.loadImage();
      if (!this._image) return;
      const { imageOptions, qrOptions } = this._options;
      const coverLevel = imageOptions.imageSize * errorCorrectionPercents[qrOptions.errorCorrectionLevel];
      const maxHiddenDots = Math.floor(coverLevel * count * count);

      drawImageSize = calculateImageSize({
        originalWidth: this._image.width,
        originalHeight: this._image.height,
        maxHiddenDots,
        maxHiddenAxisDots: count - 14,
        dotSize,
      });
    }

    this._element.appendChild(this._style);
    this._element.appendChild(this._defs);

    this.clear();
    this.drawBackground();
    this.drawDots((i: number, j: number): boolean => {
      if (this._options.imageOptions.hideBackgroundDots) {
        if (
          i >= (count - drawImageSize.hideXDots) / 2 &&
          i < (count + drawImageSize.hideXDots) / 2 &&
          j >= (count - drawImageSize.hideYDots) / 2 &&
          j < (count + drawImageSize.hideYDots) / 2
        ) {
          return false;
        }
      }

      if (squareMask[i]?.[j] || squareMask[i - count + 7]?.[j] || squareMask[i]?.[j - count + 7]) {
        return false;
      }

      if (dotMask[i]?.[j] || dotMask[i - count + 7]?.[j] || dotMask[i]?.[j - count + 7]) {
        return false;
      }

      return true;
    });
    this.drawCorners();

    if (this._options.image) {
      await this.drawImage({ width: drawImageSize.width, height: drawImageSize.height, count, dotSize });
    }
  }

  drawBackground(): void {
    const element = this._element;
    const options = this._options;

    if (element) {
      const gradientOptions = options.backgroundOptions?.gradient;
      const color = options.backgroundOptions?.color;

      if (gradientOptions) {
        this._createColor({
          options: gradientOptions,
          color: color,
          additionalRotation: 0,
          x: 0,
          y: 0,
          height: options.height,
          width: options.width,
          name: "background-color",
        });
      } else if (options.backgroundOptions?.color) {
        this._createStyle({
          color: color,
          name: "background-color",
        });
      }
    }
  }

  drawDots(filter?: FilterFunction): void {
    if (!this._qr) {
      throw "QR code is not defined";
    }

    const options = this._options;
    const count = this._qr.getModuleCount();

    if (count > options.width || count > options.height) {
      throw "The canvas is too small.";
    }

    const minSize = Math.min(options.width, options.height) - options.margin * 2;
    const dotSize = Math.floor(minSize / count);
    const xBeginning = Math.floor((options.width - count * dotSize) / 2);
    const yBeginning = Math.floor((options.height - count * dotSize) / 2);
    const dot = new QRDot({ svg: this._element, type: options.dotsOptions.type });

    if (options.dotsOptions?.gradient) {
      this._dotsClipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      this._dotsClipPath.setAttribute("id", "clip-path-dot-color");
      this._defs.appendChild(this._dotsClipPath);
      this._createColor({
        options: options.dotsOptions?.gradient,
        color: options.dotsOptions.color,
        additionalRotation: 0,
        x: xBeginning,
        y: yBeginning,
        height: count * dotSize,
        width: count * dotSize,
        name: "dot-color",
      });
    } else if (options.dotsOptions.color) {
      this._dots = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this._dots.setAttribute("class", "dot-color");
      this._element.appendChild(this._dots);
      this._createStyle({
        color: options.dotsOptions.color,
        name: "dot-color",
      });
    }

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        if (filter && !filter(i, j)) {
          continue;
        }
        if (!this._qr?.isDark(i, j)) {
          continue;
        }

        const x = this._options.useLegacyDotRotation ? xBeginning + i * dotSize : yBeginning + j * dotSize;
        const y = this._options.useLegacyDotRotation ? yBeginning + j * dotSize : xBeginning + i * dotSize;

        dot.draw(x, y, dotSize, (xOffset: number, yOffset: number): boolean => {
          if (this._options.useLegacyDotRotation) {
            if (i + xOffset < 0 || j + yOffset < 0 || i + xOffset >= count || j + yOffset >= count) return false;
            if (filter && !filter(i + xOffset, j + yOffset)) return false;
            return !!this._qr && this._qr.isDark(i + xOffset, j + yOffset);
          }
          if (j + xOffset < 0 || i + yOffset < 0 || j + xOffset >= count || i + yOffset >= count) return false;
          if (filter && !filter(j + xOffset, i + yOffset)) return false;
          return !!this._qr && this._qr.isDark(i + yOffset, j + xOffset);
        });

        if (dot._element && this._dotsClipPath) {
          this._dotsClipPath.appendChild(dot._element);
        } else if (dot._element && this._dots) {
          this._dots.appendChild(dot._element);
        }
      }
    }
  }

  drawCorners(): void {
    if (!this._qr) {
      throw "QR code is not defined";
    }

    const element = this._element;
    const options = this._options;

    if (!element) {
      throw "Element code is not defined";
    }

    const count = this._qr.getModuleCount();
    const minSize = Math.min(options.width, options.height) - options.margin * 2;
    const dotSize = Math.floor(minSize / count);
    const cornersSquareSize = dotSize * 7;
    const cornersDotSize = dotSize * 3;
    const xBeginning = Math.floor((options.width - count * dotSize) / 2);
    const yBeginning = Math.floor((options.height - count * dotSize) / 2);
    [
      [0, 0, 0],
      [1, 0, Math.PI / 2],
      [0, 1, -Math.PI / 2],
    ].forEach(([column, row, rotation]) => {
      const x = xBeginning + column * dotSize * (count - 7);
      const y = yBeginning + row * dotSize * (count - 7);
      let cornersSquareClipPath = this._dotsClipPath;
      let cornersDotClipPath = this._dotsClipPath;

      if (options.cornersSquareOptions?.gradient) {
        cornersSquareClipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        cornersSquareClipPath.setAttribute("id", `clip-path-corners-square-color-${column}-${row}`);
        this._defs.appendChild(cornersSquareClipPath);
        this._cornersSquareClipPath = this._cornersDotClipPath = cornersDotClipPath = cornersSquareClipPath;

        this._createColor({
          options: options.cornersSquareOptions?.gradient,
          color: options.cornersSquareOptions?.color,
          additionalRotation: rotation,
          x,
          y,
          height: cornersSquareSize,
          width: cornersSquareSize,
          name: `corners-square-color-${column}-${row}`,
        });
      } else {
        this._cornerSquares = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this._cornerSquares.setAttribute("class", `corners-square-color-${column}-${row}`);
        this._element.appendChild(this._cornerSquares);
        this._createStyle({
          color: options.cornersSquareOptions?.color,
          name: `corners-square-color-${column}-${row}`,
        });
      }

      if (options.cornersSquareOptions?.type) {
        const cornersSquare = new QRCornerSquare({ svg: this._element, type: options.cornersSquareOptions.type });

        cornersSquare.draw(x, y, cornersSquareSize, rotation);

        if (options.cornersSquareOptions?.gradient && cornersSquare._element && cornersSquareClipPath) {
          cornersSquareClipPath.appendChild(cornersSquare._element);
        } else if (cornersSquare._element && this._cornerSquares) {
          this._cornerSquares.appendChild(cornersSquare._element);
        }
      } else {
        const dot = new QRDot({ svg: this._element, type: options.dotsOptions.type });

        for (let i = 0; i < squareMask.length; i++) {
          for (let j = 0; j < squareMask[i].length; j++) {
            if (!squareMask[i]?.[j]) {
              continue;
            }

            dot.draw(
              x + i * dotSize,
              y + j * dotSize,
              dotSize,
              (xOffset: number, yOffset: number): boolean => !!squareMask[i + xOffset]?.[j + yOffset]
            );

            if (dot._element && this._cornersSquareClipPath) {
              this._cornersSquareClipPath.appendChild(dot._element);
            } else if (dot._element && this._cornerSquares) {
              this._cornerSquares.appendChild(dot._element);
            }
          }
        }
      }

      if (options.cornersDotOptions?.gradient) {
        cornersDotClipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        cornersDotClipPath.setAttribute("id", `clip-path-corners-dot-color-${column}-${row}`);
        this._defs.appendChild(cornersDotClipPath);
        this._cornersDotClipPath = cornersDotClipPath;

        this._createColor({
          options: options.cornersDotOptions?.gradient,
          color: options.cornersDotOptions?.color,
          additionalRotation: rotation,
          x: x + dotSize * 2,
          y: y + dotSize * 2,
          height: cornersDotSize,
          width: cornersDotSize,
          name: `corners-dot-color-${column}-${row}`,
        });
      } else {
        this._cornerDots = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this._cornerDots.setAttribute("class", `corners-dot-color-${column}-${row}`);
        this._element.appendChild(this._cornerDots);
        this._createStyle({
          color: options.cornersDotOptions?.color,
          name: `corners-dot-color-${column}-${row}`,
        });
      }

      if (options.cornersDotOptions?.type) {
        const cornersDot = new QRCornerDot({ svg: this._element, type: options.cornersDotOptions.type });

        cornersDot.draw(x + dotSize * 2, y + dotSize * 2, cornersDotSize, rotation);

        if (options.cornersDotOptions?.gradient && cornersDot._element && cornersDotClipPath) {
          cornersDotClipPath.appendChild(cornersDot._element);
        } else if (cornersDot._element && this._cornerDots) {
          this._cornerDots.appendChild(cornersDot._element);
        }
      } else {
        const dot = new QRDot({ svg: this._element, type: options.dotsOptions.type });

        for (let i = 0; i < dotMask.length; i++) {
          for (let j = 0; j < dotMask[i].length; j++) {
            if (!dotMask[i]?.[j]) {
              continue;
            }

            dot.draw(
              x + i * dotSize,
              y + j * dotSize,
              dotSize,
              (xOffset: number, yOffset: number): boolean => !!dotMask[i + xOffset]?.[j + yOffset]
            );

            if (dot._element && this._cornersDotClipPath) {
              this._cornersDotClipPath.appendChild(dot._element);
            } else if (dot._element && this._cornerDots) {
              this._cornerDots.appendChild(dot._element);
            }
          }
        }
      }
    });
  }

  loadImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = this._options;
      const image = new Image();

      if (!options.image) {
        return reject("Image is not defined");
      }

      if (typeof options.imageOptions.crossOrigin === "string") {
        image.crossOrigin = options.imageOptions.crossOrigin;
      }

      this._image = image;
      image.onload = (): void => {
        resolve();
      };
      image.src = options.image;
    });
  }

  async drawImage({
    width,
    height,
    count,
    dotSize,
  }: {
    width: number;
    height: number;
    count: number;
    dotSize: number;
  }): Promise<void> {
    const options = this._options;
    const xBeginning = Math.floor((options.width - count * dotSize) / 2);
    const yBeginning = Math.floor((options.height - count * dotSize) / 2);
    const dx = xBeginning + options.imageOptions.margin + (count * dotSize - width) / 2;
    const dy = yBeginning + options.imageOptions.margin + (count * dotSize - height) / 2;
    const dw = width - options.imageOptions.margin * 2;
    const dh = height - options.imageOptions.margin * 2;

    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");

    const base64Image = await this._getBase64Image(options.image || "");

    image.setAttribute("href", base64Image);
    image.setAttribute("xlink:href", base64Image);
    image.setAttribute("x", String(dx));
    image.setAttribute("y", String(dy));
    image.setAttribute("width", `${dw}px`);
    image.setAttribute("height", `${dh}px`);

    this._element.appendChild(image);
  }

  async _getImageBlob(url: string): Promise<Blob> {
    const resp = await fetch(url);
    return resp.blob();
  }

  // convert a blob to base64
  _blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        resolve(dataUrl as string);
      };
      reader.readAsDataURL(blob);
    });
  }

  async _getBase64Image(url: string): Promise<string> {
    if (url === "") {
      return new Promise((resolve) => {
        resolve("");
      });
    }

    const blob = await this._getImageBlob(url);
    const base64 = await this._blobToBase64(blob);
    return base64;
  }

  _createColor({
    options,
    color,
    additionalRotation,
    x,
    y,
    height,
    width,
    name,
  }: {
    options?: Gradient;
    color?: string;
    additionalRotation: number;
    x: number;
    y: number;
    height: number;
    width: number;
    name: string;
  }): void {
    const size = width > height ? width : height;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("height", String(height));
    rect.setAttribute("width", String(width));
    rect.setAttribute("clip-path", `url('#clip-path-${name}')`);

    if (options) {
      let gradient: SVGElement;
      if (options.type === gradientTypes.radial) {
        gradient = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
        gradient.setAttribute("id", name);
        gradient.setAttribute("gradientUnits", "userSpaceOnUse");
        gradient.setAttribute("fx", String(x + width / 2));
        gradient.setAttribute("fy", String(y + height / 2));
        gradient.setAttribute("cx", String(x + width / 2));
        gradient.setAttribute("cy", String(y + height / 2));
        gradient.setAttribute("r", String(size / 2));
      } else {
        const rotation = ((options.rotation || 0) + additionalRotation) % (2 * Math.PI);
        const positiveRotation = (rotation + 2 * Math.PI) % (2 * Math.PI);
        let x0 = x + width / 2;
        let y0 = y + height / 2;
        let x1 = x + width / 2;
        let y1 = y + height / 2;

        if (
          (positiveRotation >= 0 && positiveRotation <= 0.25 * Math.PI) ||
          (positiveRotation > 1.75 * Math.PI && positiveRotation <= 2 * Math.PI)
        ) {
          x0 = x0 - width / 2;
          y0 = y0 - (height / 2) * Math.tan(rotation);
          x1 = x1 + width / 2;
          y1 = y1 + (height / 2) * Math.tan(rotation);
        } else if (positiveRotation > 0.25 * Math.PI && positiveRotation <= 0.75 * Math.PI) {
          y0 = y0 - height / 2;
          x0 = x0 - width / 2 / Math.tan(rotation);
          y1 = y1 + height / 2;
          x1 = x1 + width / 2 / Math.tan(rotation);
        } else if (positiveRotation > 0.75 * Math.PI && positiveRotation <= 1.25 * Math.PI) {
          x0 = x0 + width / 2;
          y0 = y0 + (height / 2) * Math.tan(rotation);
          x1 = x1 - width / 2;
          y1 = y1 - (height / 2) * Math.tan(rotation);
        } else if (positiveRotation > 1.25 * Math.PI && positiveRotation <= 1.75 * Math.PI) {
          y0 = y0 + height / 2;
          x0 = x0 + width / 2 / Math.tan(rotation);
          y1 = y1 - height / 2;
          x1 = x1 - width / 2 / Math.tan(rotation);
        }

        gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", name);
        gradient.setAttribute("gradientUnits", "userSpaceOnUse");
        gradient.setAttribute("x1", String(Math.round(x0)));
        gradient.setAttribute("y1", String(Math.round(y0)));
        gradient.setAttribute("x2", String(Math.round(x1)));
        gradient.setAttribute("y2", String(Math.round(y1)));
      }

      options.colorStops.forEach(({ offset, color }: { offset: number; color: string }) => {
        const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop.setAttribute("offset", `${100 * offset}%`);
        stop.setAttribute("stop-color", color);
        gradient.appendChild(stop);
      });

      rect.setAttribute("fill", `url('#${name}')`);
      this._defs.appendChild(gradient);
    } else if (color) {
      rect.setAttribute("fill", color);
    }

    this._element.appendChild(rect);
  }

  _createStyle({ color, name }: { color?: string; name: string }): void {
    this._style.innerHTML += `[data-internal-uid="${this.id}"] .${name}{ fill: ${color}; }`;
  }
}
