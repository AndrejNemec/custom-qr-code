import { type CSSProperties, type HTMLAttributes, forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import CustomQRCodeClass from './../core/CustomQRCode'
import type { Options } from './../core/types'

export interface CustomQRCodeProps extends Partial<Options> {
    id?: string
    className?: string
    style?: CSSProperties
    containerProps?: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'id'>
}

export type CustomQRCodeRef = {
    getContainer: () => HTMLDivElement | null
    getInstance: () => CustomQRCodeClass | null
}

export const CustomQRCode = forwardRef<CustomQRCodeRef, CustomQRCodeProps>(({
    containerProps,
    className,
    style,
    id,
    ...options
}, refProp) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const instance = useRef<CustomQRCodeClass>()

    useEffect(() => {
        if (!containerRef.current) return

        if (instance.current) {
            instance.current.update(options)
            return
        }
        const customQrCode = new CustomQRCodeClass(options)
        customQrCode.append(containerRef.current)
        instance.current = customQrCode
    }, [options])

    useImperativeHandle(refProp, () => ({
        getContainer: () => containerRef.current || null,
        getInstance: () => instance.current || null
    }), [])

    return (
        <div
            {...containerProps}
            className={className}
            style={style}
            id={id}
            ref={containerRef}
        />
    )
})