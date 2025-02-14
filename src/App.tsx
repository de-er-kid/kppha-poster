import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Upload, Download, RefreshCw } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';
import html2canvas from 'html2canvas';
import { Analytics } from "@vercel/analytics/react"

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      1,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

// Function to create a cropped image
function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      'image/jpeg',
      1
    );
  });
}

function App() {
  const [imgSrc, setImgSrc] = useState('');
  const [croppedImageUrl, setCroppedImageUrl] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [name, setName] = useState('');
  const [isCropping, setIsCropping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setCroppedImageUrl('');
        setIsCropping(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  };

  const handleCropComplete = async () => {
    if (completedCrop && imgRef.current) {
      try {
        const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
        setCroppedImageUrl(croppedImage);
        setIsCropping(false);
      } catch (e) {
        console.error('Error cropping image:', e);
      }
    }
  };

  const handleReset = () => {
    setImgSrc('');
    setCroppedImageUrl('');
    setName('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsCropping(false);
  };

  const downloadPoster = useCallback(async () => {
    if (!posterRef.current) return;
    
    setIsDownloading(true);
    try {
      // Create a container with fixed dimensions
      const container = document.createElement('div');
      container.style.width = '1080px';  // Fixed width
      container.style.height = '1516px'; // Fixed height
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      
      // Clone the poster content
      const clone = posterRef.current.cloneNode(true) as HTMLElement;
      clone.style.width = '100%';
      clone.style.height = '100%';
      clone.style.transform = 'none';
      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait for images to load
      const images = container.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      // Create canvas with html2canvas
      const canvas = await html2canvas(container, {
        width: 1080,
        height: 1516,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        imageTimeout: 0,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-html2canvas-ignore]');
          if (clonedElement) clonedElement.remove();
        }
      });

      // Clean up
      document.body.removeChild(container);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Canvas to Blob conversion failed');
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'KPPHA-poster.png';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to generate poster. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [posterRef]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8">KPPHA Poster Creator</h1>

          <div className="space-y-6">
            {!imgSrc && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <label className="cursor-pointer inline-flex items-center space-x-2">
                  <Upload className="w-6 h-6" />
                  <span>Upload your image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onSelectFile}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {isCropping && imgSrc && (
              <div className="space-y-4">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  className="max-h-[600px] mx-auto"
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="max-h-[600px] mx-auto"
                  />
                </ReactCrop>
                <button
                  onClick={handleCropComplete}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Crop & Apply
                </button>
              </div>
            )}

            {!isCropping && imgSrc && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter your name"
                  />
                </div>

                <div
                  ref={posterRef}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '368/516',
                    margin: '0',
                    backgroundColor: 'white',
                    overflow: 'hidden'
                  }}
                >
                  <img 
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/poster-frame-srP6cI9vJUPpdCbvAu71Tgt6VPUr9n.png"
                    alt="Poster Background"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    crossOrigin="anonymous"
                  />

                  {(croppedImageUrl || imgSrc) && (
                    <div 
                      style={{ 
                        position: 'absolute',
                        bottom: '33.3%',
                        left: '50.5%',
                        transform: 'translate(-50%, 50%)',
                        width: '34%',
                        aspectRatio: '1/1'
                      }}
                    >
                      <div 
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '4px solid white',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          backgroundColor: 'white'
                        }}
                      >
                        <img
                          src={croppedImageUrl || imgSrc}
                          alt="Selected"
                          className="user-image"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          crossOrigin="anonymous"
                        />
                      </div>
                    </div>
                  )}

                  <div 
                    style={{ 
                      position: 'absolute',
                      bottom: '16.5%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '80%',
                      maxWidth: '400px'
                    }}
                  >
                    <div 
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        transform: 'rotate(-6deg)'
                      }}
                    >
                      <p style={{
                        color: 'white',
                        textAlign: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        transform: 'rotate(6deg)'
                      }}>
                        {name || 'Your Name Here'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Reset</span>
                  </button>
                  <button
                    onClick={downloadPoster}
                    disabled={isDownloading}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5" />
                    <span>{isDownloading ? 'Generating...' : 'Download'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Analytics/>
    </div>
  );
}

export default App;