import { useRef, useState, useEffect } from 'react';

const CameraCapture = ({ onCapture }: { onCapture: (file: File) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    if (stream) return; // ป้องกันเปิดกล้องซ้ำ
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
    } catch (err) {
      alert('ไม่สามารถเปิดกล้องได้: ' + (err && (err as Error).message));
      console.error('Camera error:', err);
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg');
      }
    }
    // ปิดกล้องหลัง capture
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };


  return (
    <div style={{ display: 'inline-block' }}>
      {/* ปุ่มเปิดกล้องและกล้อง */}
      {!stream && (
        <button
          type="button"
          onClick={startCamera}
          className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 inline-block mr-2"
        >
          เปิดกล้อง
        </button>
      )}
      {stream && (
        <div style={{ marginTop: 8 }}>
          <video ref={videoRef} width={320} height={240} autoPlay playsInline style={{ borderRadius: 8, border: '1px solid #ccc' }} />
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={capture}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 mr-2"
            >
              ถ่ายภาพ
            </button>
            <button
              type="button"
              onClick={() => {
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                  setStream(null);
                }
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              ปิดกล้อง
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
    </div>
  );
};

export default CameraCapture;
