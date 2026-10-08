"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Crop,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Check,
  Loader2,
  Sparkles,
  Layers,
} from "lucide-react";

const ASPECT_RATIOS = [
  { label: "4:5 Category", value: 4 / 5, desc: "Storefront Card" },
  { label: "3:4 Portrait", value: 3 / 4, desc: "Editorial" },
  { label: "1:1 Square", value: 1 / 1, desc: "Square Card" },
  { label: "16:9 Banner", value: 16 / 9, desc: "Hero Banner" },
  { label: "Original", value: null, desc: "Unconstrained" },
];

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  title = "Crop & Frame Category Image",
  defaultAspect = 4 / 5,
}) {
  const [selectedAspect, setSelectedAspect] = useState(defaultAspect);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef(null);
  const cropBoxRef = useRef(null);
  const imageRef = useRef(null);

  // Reset when opening a new image
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setSelectedAspect(defaultAspect);
      setIsSaving(false);
    }
  }, [isOpen, imageSrc, defaultAspect]);

  // Load image dimensions
  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImageSize({
      width: naturalWidth,
      height: naturalHeight,
      naturalWidth,
      naturalHeight,
    });
  };

  // Mouse & Touch Pan Handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.8), 3.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Perform High-Resolution Canvas Crop & Export
  const handleApplyCrop = async () => {
    if (!imageRef.current || !cropBoxRef.current || !containerRef.current) return;
    setIsSaving(true);

    try {
      const img = imageRef.current;
      const cropBox = cropBoxRef.current.getBoundingClientRect();
      const containerBox = containerRef.current.getBoundingClientRect();

      // Target high-resolution canvas dimensions
      let targetWidth = 800;
      let targetHeight = 1000;
      if (selectedAspect) {
        if (selectedAspect >= 1) {
          targetWidth = 1000;
          targetHeight = Math.round(1000 / selectedAspect);
        } else {
          targetHeight = 1000;
          targetWidth = Math.round(1000 * selectedAspect);
        }
      } else {
        targetWidth = Math.max(Math.round(cropBox.width * 2), 400);
        targetHeight = Math.max(Math.round(cropBox.height * 2), 400);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not access canvas 2D context");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Clean background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Crop box screen center
      const cropBoxCenterX = cropBox.left + cropBox.width / 2;
      const cropBoxCenterY = cropBox.top + cropBox.height / 2;

      // Container center (where unpanned image is centered)
      const containerCenterX = containerBox.left + containerBox.width / 2;
      const containerCenterY = containerBox.top + containerBox.height / 2;

      // Image center in screen coordinates
      const imageCenterX = containerCenterX + pan.x;
      const imageCenterY = containerCenterY + pan.y;

      // Scale between cropBox and canvas
      const canvasScale = targetWidth / cropBox.width;

      // Image center on canvas
      const canvasImageCenterX = targetWidth / 2 + (imageCenterX - cropBoxCenterX) * canvasScale;
      const canvasImageCenterY = targetHeight / 2 + (imageCenterY - cropBoxCenterY) * canvasScale;

      // Rendered unzoomed dimensions of the img element
      const unscaledWidth = img.offsetWidth || img.naturalWidth;
      const unscaledHeight = img.offsetHeight || img.naturalHeight;

      const drawWidth = unscaledWidth * zoom * canvasScale;
      const drawHeight = unscaledHeight * zoom * canvasScale;

      ctx.save();
      ctx.translate(canvasImageCenterX, canvasImageCenterY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Convert canvas to Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsSaving(false);
            return;
          }
          const dataUrl = canvas.toDataURL("image/webp", 0.92);
          onCropComplete(blob, dataUrl);
          setIsSaving(false);
          onClose();
        },
        "image/webp",
        0.92
      );
    } catch (err) {
      console.error("Cropping export failed:", err);
      setIsSaving(false);
    }
  };

  // Compute crop box style based on selected aspect ratio
  const getCropBoxDimensions = () => {
    const maxWidth = 340;
    const maxHeight = 340;

    if (!selectedAspect) {
      return { width: "88%", height: "88%", maxWidth, maxHeight };
    }

    if (selectedAspect >= 1) {
      // Landscape or square
      const width = maxWidth;
      const height = maxWidth / selectedAspect;
      return { width: `${width}px`, height: `${height}px` };
    } else {
      // Portrait (e.g. 4/5 = 0.8)
      const height = maxHeight;
      const width = maxHeight * selectedAspect;
      return { width: `${width}px`, height: `${height}px` };
    }
  };

  const cropBoxStyle = getCropBoxDimensions();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-3xl max-h-[94vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl box-border">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-900 text-white shrink-0">
              <Crop className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 truncate">
                Choose a frame preset, drag to position the subject, and set zoom for a perfect storefront card.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Frame Preset Toolbar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              Select Frame Ratio
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Storefront Category Card is 4:5
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ASPECT_RATIOS.map((preset) => {
              const isActive = selectedAspect === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSelectedAspect(preset.value);
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs font-semibold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
                  }`}
                >
                  {isActive && <Check className="h-3 w-3 shrink-0" />}
                  <span>{preset.label}</span>
                  <span
                    className={`text-[10px] opacity-70 ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    ({preset.desc})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Cropper Canvas Viewport */}
        <div className="relative my-2 rounded-xl bg-slate-950/90 overflow-hidden flex items-center justify-center min-h-[320px] sm:min-h-[380px] select-none border border-slate-800 shadow-inner">
          {/* Draggable & Zoomable Image */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
            className="absolute inset-0 flex items-center justify-center cursor-move"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              crossOrigin="anonymous"
              alt="Crop target"
              onLoad={onImageLoad}
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                maxHeight: "360px",
                maxWidth: "100%",
                objectFit: "contain",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
              className="pointer-events-none select-none drop-shadow-md"
            />
          </div>

          {/* Semi-transparent Dimmed Backdrop Mask */}
          <div className="absolute inset-0 pointer-events-none bg-slate-950/60" />

          {/* Highlighted Active Crop Box with Rule-of-Thirds Grid */}
          <div
            ref={cropBoxRef}
            style={cropBoxStyle}
            className="relative z-10 pointer-events-none border-2 border-white/90 rounded-lg shadow-2xl overflow-hidden backdrop-brightness-125"
          >
            {/* Rule of thirds grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div />
            </div>

            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-white" />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-white" />
            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-white" />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-white" />

            {/* Framing Guide Badge */}
            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/70 text-white text-[10px] font-mono tracking-tight backdrop-blur-xs">
              {selectedAspect === 4 / 5 ? "4:5 Storefront Card" : `${Math.round(zoom * 100)}%`}
            </div>
          </div>

          {/* Quick Instruction Floating Helper */}
          <div className="absolute top-2.5 left-3 z-20 pointer-events-none text-[11px] text-white/80 bg-slate-950/60 px-2.5 py-1 rounded-full backdrop-blur-xs font-medium">
            Drag image to pan • Scroll to zoom
          </div>
        </div>

        {/* Adjustments: Zoom Slider & Rotate Controls */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ZoomOut
                className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-700 shrink-0"
                onClick={() => setZoom((z) => Math.max(z - 0.2, 0.8))}
              />
              <input
                type="range"
                min="0.8"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-slate-900 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <ZoomIn
                className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-700 shrink-0"
                onClick={() => setZoom((z) => Math.min(z + 0.2, 3.0))}
              />
              <span className="text-xs font-mono font-semibold text-slate-700 min-w-[42px] text-right shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Quick Rotate & Reset buttons */}
            <div className="flex items-center gap-1.5 shrink-0 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="h-8 text-xs text-slate-700 hover:bg-slate-100 border-slate-200"
                title="Rotate 90 degrees clockwise"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1" />
                Rotate 90°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs text-slate-600 hover:bg-slate-100 border-slate-200"
                title="Reset zoom and position"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Footer: Cancel & Apply Crop Actions */}
        <div className="border-t border-slate-100 pt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Cropped image will automatically sync to Storefront & Admin</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="h-9 flex-1 sm:flex-initial text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApplyCrop}
              disabled={isSaving}
              className="h-9 flex-1 sm:flex-initial text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 justify-center min-w-[140px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Applying Crop...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Apply & Save Crop
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
