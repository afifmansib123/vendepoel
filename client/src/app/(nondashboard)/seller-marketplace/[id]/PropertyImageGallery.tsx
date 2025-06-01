// src/app/(nondashboard)/seller-marketplace/[id]/PropertyImageGallery.tsx
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'; // Lucide's Image icon

interface PropertyImageGalleryProps {
  images: string[];
  propertyName: string;
}

const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({ images, propertyName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="relative h-72 md:h-96 w-full bg-gray-200 flex items-center justify-center rounded-lg shadow-inner">
        <ImageIcon size={48} className="text-gray-400" /> {/* Lucide Image Icon */}
        <p className="ml-2 text-gray-500">No images available</p>
      </div>
    );
  }

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const selectImage = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="w-full">
      <div className="relative h-72 md:h-96 w-full rounded-lg overflow-hidden shadow-lg group">
        <Image
          src={images[currentIndex]}
          alt={`${propertyName} - Image ${currentIndex + 1}`}
          layout="fill"
          objectFit="cover"
          priority={true}
          className="transition-transform duration-500 ease-in-out group-hover:scale-105"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute top-1/2 left-3 transform -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 transition-opacity focus:outline-none opacity-0 group-hover:opacity-100"
              aria-label="Previous Image"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute top-1/2 right-3 transform -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 transition-opacity focus:outline-none opacity-0 group-hover:opacity-100"
              aria-label="Next Image"
            >
              <ChevronRight size={24} />
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {images.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => selectImage(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${currentIndex === idx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                        aria-label={`Go to image ${idx + 1}`}
                    />
                ))}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              className={`relative aspect-square rounded overflow-hidden cursor-pointer border-2 ${
                currentIndex === index ? 'border-primary-500 ring-2 ring-primary-500' : 'border-transparent hover:border-gray-400'
              }`}
              onClick={() => selectImage(index)}
            >

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyImageGallery;