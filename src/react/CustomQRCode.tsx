import { type CSSProperties, type HTMLAttributes, forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import CustomQRCodeClass from "./../core/CustomQRCode";
import type { CustomQRCodeOptions } from "./../core/types";

export type { CustomQRCodeOptions };

export interface CustomQRCodeProps extends Partial<CustomQRCodeOptions> {
  id?: string;
  className?: string;
  style?: CSSProperties;
  containerProps?: Omit<HTMLAttributes<HTMLDivElement>, "className" | "style" | "id">;
}

export type CustomQRCodeRef = {
  getContainer: () => HTMLDivElement | null;
  getInstance: () => CustomQRCodeClass | null;
};

export const CustomQRCode = forwardRef<CustomQRCodeRef, CustomQRCodeProps>(
  (
    {
      containerProps,
      className,
      style,
      id,
      //Options
      type,
      width,
      height,
      margin = 0,
      data,
      image,
      qrOptions = {},
      imageOptions = {},
      dotsOptions = {},
      cornersSquareOptions = {},
      cornersDotOptions = {},
    },
    refProp
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const instance = useRef<CustomQRCodeClass>(null);

    useEffect(() => {
      if (!containerRef.current) return;

      if (instance.current) {
        instance.current.update({
          type,
          width,
          height,
          margin,
          data,
          image,
          qrOptions,
          imageOptions,
          dotsOptions,
          cornersSquareOptions,
          cornersDotOptions,
        });
        return;
      }
      const customQrCode = new CustomQRCodeClass({
        type,
        width,
        height,
        margin,
        data,
        image,
        qrOptions,
        imageOptions,
        dotsOptions,
        cornersSquareOptions,
        cornersDotOptions,
      });
      customQrCode.append(containerRef.current);
      instance.current = customQrCode;
    }, [
      type,
      width,
      height,
      margin,
      data,
      image,
      qrOptions,
      imageOptions,
      dotsOptions,
      cornersSquareOptions,
      cornersDotOptions,
    ]);

    useImperativeHandle(
      refProp,
      () => ({
        getContainer: () => containerRef.current || null,
        getInstance: () => instance.current || null,
      }),
      []
    );

    return <div {...containerProps} className={className} style={style} id={id} ref={containerRef} />;
  }
);
