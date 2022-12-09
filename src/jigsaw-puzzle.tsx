import React, { FC, useCallback, useEffect, useRef, useState } from 'react'

const clamp = (value: number, min: number, max: number) => {
  if (value < min) { return min }
  if (value > max) { return max }
  return value
}

const solveTolerancePercentage = 0.028

interface Tile {
  tileOffsetX: number
  tileOffsetY: number,
  tileWidth: number,
  tileHeight: number,
  correctPosition: number,
  currentPosXPerc: number,
  currentPosYPerc: number,
  solved: boolean,
  type: PieceType
}

enum PieceType {
  topLeft="topLeft",
  topRight="topRight",
  bottomLeft="bottomLeft",
  bottomRight="bottomRight",
  topEdge="topEdge",
  leftEdge="leftEdge",
  bottomEdge="bottomEdge",
  rightEdge="rightEdge",
  middle="middle"
}

function calcType(position: number, rows: number, columns: number) {
  var topEdge = position < columns;
  var bottomEdge = position >= (rows - 1) * columns;
  var leftEdge = position == 0 || position % columns == 0;
  var rightEdge = position % columns == columns - 1;

  if (topEdge && leftEdge) return PieceType.topLeft;
  if (topEdge && rightEdge) return PieceType.topRight;
  if (topEdge) return PieceType.topEdge;
  if (bottomEdge && leftEdge) return PieceType.bottomLeft;
  if (bottomEdge && rightEdge) return PieceType.bottomRight;
  if (bottomEdge) return PieceType.bottomEdge;
  if (leftEdge) return PieceType.leftEdge;
  if (rightEdge) return PieceType.rightEdge;

  return PieceType.middle;
}

export interface JigsawPuzzleProps {
  /** Source of the image. Can be any URL or relative path. */
  imageSrc: string,
  /** The amount of rows the puzzle will have. Defaults to 3. */
  rows?: number,
  /** The amount of columns the puzzle with have. Defaults to 4. */
  columns?: number,
  /* Called when the puzzle is solved. Defaults to an empty function. */
  onSolved?: () => void
}

export const JigsawPuzzle: FC<JigsawPuzzleProps> = ({
  imageSrc,
  rows = 3,
  columns = 3,
  onSolved = () => {}
}) => {
  const [tiles, setTiles] = useState<Tile[] | undefined>()
  const [imageSize, setImageSize] = useState<{ width: number, height: number }>()
  const [rootSize, setRootSize] = useState<{ width: number, height: number }>()
  const [calculatedHeight, setCalculatedHeight] = useState<number>()
  const rootElement = useRef<HTMLElement>()
  const resizeObserver = useRef<ResizeObserver>()
  const draggingTile = useRef<{ tile: Tile, elem: HTMLElement, mouseOffsetX: number, mouseOffsetY: number } | undefined>()
  const onImageLoaded = useCallback((image: HTMLImageElement) => {
    setImageSize({ width: image.width, height: image.height })
    if (rootSize) { setCalculatedHeight(rootSize!.width / image.width * image.height) }
    setTiles(
      Array.from(Array(rows * columns).keys())
        .map(position => ({
          correctPosition: position,
          tileHeight: image.height / rows,
          tileWidth: image.width / columns,
          tileOffsetX: (position % columns) * (image.width / columns),
          tileOffsetY: Math.floor(position / columns) * (image.height / rows),
          currentPosXPerc: Math.random() * (1 - 1 / rows),
          currentPosYPerc: Math.random() * (1 - 1 / columns),
          solved: false,
          type: calcType(position, rows, columns)
        }))
    )
  }, [rows, columns])

  const onRootElementResized = useCallback((args: ResizeObserverEntry[]) => {
    const contentRect = args.find(it => it.contentRect)?.contentRect
    if (contentRect) {
      setRootSize({
        width: contentRect.width,
        height: contentRect.height
      })
      if (imageSize) {
        setCalculatedHeight(contentRect.width / imageSize!.width * imageSize!.height)
      }
    }
  }, [setRootSize, imageSize])

  const onRootElementRendered = useCallback((element: HTMLElement | null) => {
    if (element) {
      rootElement.current = element
      const observer = new ResizeObserver(onRootElementResized)
      observer.observe(element)
      resizeObserver.current = observer
      setRootSize({
        width: element.offsetWidth,
        height: element.offsetHeight
      })
      if (imageSize) { setCalculatedHeight(element.offsetWidth / imageSize.width * imageSize.height) }
    }
  }, [setRootSize, imageSize, rootElement, resizeObserver])

  useEffect(() => {
    const image = new Image()
    image.onload = () => onImageLoaded(image)
    image.src = imageSrc
  }, [imageSrc, rows, columns])

  const onTileMouseDown = useCallback((tile: Tile, event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!tile.solved) {
      if (event.type === 'touchstart') {
        document.documentElement.style.setProperty('overflow', 'hidden')
      }

      const eventPos = {
        x: (event as React.MouseEvent).pageX ?? (event as React.TouchEvent).touches[0].pageX,
        y: (event as React.MouseEvent).pageY ?? (event as React.TouchEvent).touches[0].pageY
      }
      draggingTile.current = {
        tile,
        elem: event.target as HTMLDivElement,
        mouseOffsetX: eventPos.x - (event.target as HTMLDivElement).getBoundingClientRect().x,
        mouseOffsetY: eventPos.y - (event.target as HTMLDivElement).getBoundingClientRect().y
      };
      (event.target as HTMLDivElement).classList.add('jigsaw-puzzle__piece--dragging')
    }
  }, [draggingTile])

  const onRootMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (draggingTile.current) {
      event.stopPropagation()
      event.preventDefault()
      const eventPos = {
        x: (event as React.MouseEvent).pageX ?? (event as React.TouchEvent).touches[0].pageX,
        y: (event as React.MouseEvent).pageY ?? (event as React.TouchEvent).touches[0].pageY
      }
      const draggedToRelativeToRoot = {
        x: clamp(
          eventPos.x - rootElement.current!.getBoundingClientRect().left - draggingTile.current.mouseOffsetX,
          rootSize!.width * -2,
          rootSize!.width * 2 - draggingTile.current.elem.offsetWidth
        ),
        y: clamp(
          eventPos.y - rootElement.current!.getBoundingClientRect().top - draggingTile.current.mouseOffsetY,
          -20,
          rootSize!.height - draggingTile.current.elem.offsetHeight + 20
        )
      }
      draggingTile.current.elem.style.setProperty('left', `${draggedToRelativeToRoot.x}px`)
      draggingTile.current.elem.style.setProperty('top', `${draggedToRelativeToRoot.y}px`)
    }
  }, [draggingTile, rootSize])

  const onRootMouseUp = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (draggingTile.current) {
      if (event.type === 'touchend') {
        document.documentElement.style.removeProperty('overflow')
      }
      draggingTile.current?.elem.classList.remove('jigsaw-puzzle__piece--dragging')
      const draggedToPercentage = {
        x: clamp(draggingTile.current!.elem.offsetLeft / rootSize!.width, 0, 1),
        y: clamp(draggingTile.current!.elem.offsetTop / rootSize!.height, 0, 1)
      }
      const draggedTile = draggingTile.current.tile
      const targetPositionPercentage = {
        x: draggedTile.correctPosition % columns / columns,
        y: Math.floor(draggedTile.correctPosition / columns) / rows
      }
      const isSolved = Math.abs(targetPositionPercentage.x - draggedToPercentage.x) <= solveTolerancePercentage &&
        Math.abs(targetPositionPercentage.y - draggedToPercentage.y) <= solveTolerancePercentage

      setTiles(prevState => {
        const newState = [
          ...prevState!.filter(it => it.correctPosition !== draggedTile.correctPosition),
          {
            ...draggedTile,
            currentPosXPerc: !isSolved ? draggedToPercentage.x : targetPositionPercentage.x,
            currentPosYPerc: !isSolved ? draggedToPercentage.y : targetPositionPercentage.y,
            solved: isSolved
          }
        ]
        if (newState.every(tile => tile.solved)) {
          onSolved()
        }
        return newState
      })
      draggingTile.current = undefined
    }
  }, [draggingTile, setTiles, rootSize, onSolved])

  return <div ref={onRootElementRendered}
              onTouchMove={onRootMouseMove}
              onMouseMove={onRootMouseMove}
              onTouchEnd={onRootMouseUp}
              onMouseUp={onRootMouseUp}
              onTouchCancel={onRootMouseUp}
              onMouseLeave={onRootMouseUp}
              className="jigsaw-puzzle"
              style={{ height: !calculatedHeight ? undefined : `${calculatedHeight}px` }}
              onDragEnter={event => {
                event.stopPropagation()
                event.preventDefault()
              }}
              onDragOver={event => {
                event.stopPropagation()
                event.preventDefault()
              }}
  >
    {tiles && rootSize && imageSize && tiles.map(tile =>
      <div
        draggable={false}
        onMouseDown={event => onTileMouseDown(tile, event)}
        onTouchStart={event => onTileMouseDown(tile, event)}
        key={tile.correctPosition}
        className={`jigsaw-puzzle__piece jigsaw-puzzle__piece--${tile.type} ${tile.solved ? ' jigsaw-puzzle__piece--solved' : ''} `}
        style={{
          position: 'absolute',
          height: `${1 / rows * 100}%`,
          width: `${1 / columns * 100}%`,
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: `${rootSize.width}px ${rootSize.height}px`,
          backgroundPositionX: `${tile.correctPosition % columns / (columns - 1) * 100}%`,
          backgroundPositionY: `${Math.floor(tile.correctPosition / columns) / (rows - 1) * 100}%`,
          left: `${tile.currentPosXPerc * rootSize.width}px`,
          top: `${tile.currentPosYPerc * rootSize.height}px`
        }}/>)}
  </div>
}
