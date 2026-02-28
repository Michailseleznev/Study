// Gallery configuration for photo categories
// This script loads photos from the respective folders

const galleryConfig = {
  "Студийные съёмки": {
    title: "Студийные съёмки",
    folder: "Студийные съёмки",
    files: []
  },
  "Портреты": {
    title: "Портреты",
    folder: "Портреты",
    files: []
  },
  "Креативные съёмки": {
    title: "Креативные съёмки",
    folder: "Креативные съёмки",
    files: []
  },
  "Стоковые фотографии": {
    title: "Стоковые фотографии",
    folder: "Стоковые фотографии",
    files: []
  },
  "Природа": {
    title: "Природа",
    folder: "Природа",
    files: []
  }
};

// Function to find all existing images in a category folder
async function findImagesInFolder(folderName, maxCount = 5) {
  // List of known image files for each category based on what exists
  const categoryFiles = {
    "Студийные съёмки": ["mikhail-seleznev-DKq.jpg", "mikhail-seleznev-E4d.jpg", "mikhail-seleznev-R7c.jpg", "mikhail-seleznev-unH.jpg"],
    "Портреты": ["IMG_1687.jpg", "IMG_6854.jpg", "_MG_2381.jpg", "mikhail-seleznev-3VO.jpg"],
    "Креативные съёмки": ["IMG_4472_1.jpg", "IMG_6990_1.jpg", "mikhail-seleznev-bMp.jpg", "mikhail-seleznev-oAf.jpg"],
    "Стоковые фотографии": ["075D56A0-FCE1-4EE3-8.jpeg", "C6A656AE-E6AE-4411-9.jpg", "mikhail-seleznev-9hm.jpg", "mikhail-seleznev-jCb.jpg"],
    "Природа": ["IMG_0747.jpg", "IMG_0756_3.jpg", "_MG_6396.jpg", "_MG_7103.jpg"]
  };
  
  const availableFiles = categoryFiles[folderName] || [];
  const imageFiles = [];
  
  // Check which files actually exist and add up to maxCount
  for (let i = 0; i < Math.min(availableFiles.length, maxCount); i++) {
    const fileName = availableFiles[i];
    const imagePath = `${folderName}/${fileName}`;
    
    if (await checkImageExists(imagePath)) {
      imageFiles.push(fileName);
    }
  }
  
  return imageFiles;
}

// Function to check if image exists
function checkImageExists(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// Function to load images from each category
async function loadGallery() {
  const galleryContainer = document.getElementById('gallery');

  if (!galleryContainer) {
    console.error('Gallery container not found');
    return;
  }

  // Clear existing content
  galleryContainer.innerHTML = '';

  // Process each category
  for (const [categoryId, config] of Object.entries(galleryConfig)) {
    // Dynamically find images in the folder
    config.files = await findImagesInFolder(config.folder);
    
    if (config.files.length === 0) {
      continue; // Skip categories with no images
    }
    
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';

    const title = document.createElement('h2');
    title.textContent = config.title;
    categoryDiv.appendChild(title);

    const categoryGrid = document.createElement('div');
    categoryGrid.className = 'photo-grid';

    // Load each file from the dynamically found files
    for (const fileName of config.files) {
      const imagePath = `${config.folder}/${fileName}`;

      const img = document.createElement('img');
      img.src = imagePath;
      img.alt = `${config.title} - ${fileName}`;
      img.className = 'gallery-photo';
      img.loading = 'lazy';

      img.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        showLightbox(this.src, this.alt);
      });

      categoryGrid.appendChild(img);
    }

    categoryDiv.appendChild(categoryGrid);
    galleryContainer.appendChild(categoryDiv);
  }
}

// Lightbox functionality - МАКСИМАЛЬНО УПРОШЕНО И НАДЕЖНО
let activeLightbox = null;

function closeLightbox() {
  console.log('Closing lightbox...');

  // Находим все lightbox элементы
  const lightboxes = document.querySelectorAll('.gallery-lightbox');
  lightboxes.forEach(lb => {
    if (lb && lb.parentNode) {
      lb.parentNode.removeChild(lb);
    }
  });

  // Очищаем переменную
  activeLightbox = null;

  // Восстанавливаем прокрутку
  document.body.style.overflow = '';

  console.log('Lightbox closed');
}

function showLightbox(src, alt) {
  console.log('Opening lightbox for:', src);

  // Закрываем предыдущий lightbox если есть
  closeLightbox();

  // Блокируем прокрутку
  document.body.style.overflow = 'hidden';

  // Создаем контейнер
  const lightbox = document.createElement('div');
  lightbox.className = 'gallery-lightbox';
  lightbox.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  `;

  // Контейнер для изображения
  const imgContainer = document.createElement('div');
  imgContainer.style.cssText = `
    max-width: 90%;
    max-height: 80%;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Изображение
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.style.cssText = `
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
  `;

  // Кнопка закрытия (крестик)
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid white;
    border-radius: 50%;
    color: white;
    font-size: 30px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000000;
    transition: all 0.3s ease;
  `;
  closeBtn.onmouseover = function() {
    this.style.background = 'rgba(255, 255, 255, 0.4)';
    this.style.transform = 'scale(1.1)';
  };
  closeBtn.onmouseout = function() {
    this.style.background = 'rgba(255, 255, 255, 0.2)';
    this.style.transform = 'scale(1)';
  };

  // Текстовая кнопка "Закрыть" снизу
  const closeTextBtn = document.createElement('button');
  closeTextBtn.textContent = 'Закрыть (ESC)';
  closeTextBtn.style.cssText = `
    margin-top: 20px;
    padding: 12px 30px;
    background: white;
    color: black;
    border: none;
    border-radius: 25px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
  `;
  closeTextBtn.onmouseover = function() {
    this.style.background = '#f0f0f0';
    this.style.transform = 'scale(1.05)';
  };
  closeTextBtn.onmouseout = function() {
    this.style.background = 'white';
    this.style.transform = 'scale(1)';
  };

  // Обработчики закрытия - МНОЖЕСТВЕННЫЕ для надежности
  const closeHandlers = [
    // 1. Клик по крестику
    () => {
      closeBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Close via X button');
        closeLightbox();
      };
    },

    // 2. Клик по текстовой кнопке
    () => {
      closeTextBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Close via text button');
        closeLightbox();
      };
    },

    // 3. Клик по фону (но не по изображению)
    () => {
      lightbox.onclick = function(e) {
        if (e.target === lightbox) {
          console.log('Close via background click');
          closeLightbox();
        }
      };
    },

    // 4. Escape клавиша
    () => {
      const escHandler = function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
          console.log('Close via Escape');
          closeLightbox();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    },

    // 5. Двойной клик в любом месте
    () => {
      lightbox.ondblclick = function() {
        console.log('Close via double click');
        closeLightbox();
      };
    }
  ];

  // Применяем все обработчики
  closeHandlers.forEach(handler => handler());

  // Собираем элементы
  imgContainer.appendChild(img);
  lightbox.appendChild(closeBtn);
  lightbox.appendChild(imgContainer);
  lightbox.appendChild(closeTextBtn);

  // Добавляем в DOM
  document.body.appendChild(lightbox);
  activeLightbox = lightbox;

  console.log('Lightbox created and added to DOM');
}

// Глобальный обработчик Escape (дополнительный)
document.addEventListener('keydown', function(e) {
  if ((e.key === 'Escape' || e.keyCode === 27) && activeLightbox) {
    console.log('Global Escape handler triggered');
    closeLightbox();
  }
});

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', loadGallery);