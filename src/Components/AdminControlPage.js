import React, { useState } from 'react';
import styles from './AdminControlPage.module.css';
import { Plus, Trash2, Save } from 'lucide-react';
import { addVerse, getVersesByReligion, addOtherContent, showOtherContent, removeOtherContent } from "../services/contentService";
import { uploadMotivationalImages, uploadMotivationalVideos } from "../services/contentService";
import { processVerse } from "../services/llmService";
import Navbar from "./Navbar";
import { ReactComponent as Controls } from "../assets/SettingsSlider.svg"
import clsx from 'clsx';

export default function AdminControlPage() {
  const [viewMode, setViewMode] = useState('addVerse');
  const [selectedReligion, setSelectedReligion] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');
  const [contentItems, setContentItems] = useState([{ id: 1, text: '', is_processed: false}]);
  const [nextId, setNextId] = useState(2);
  const [processedContent, setProcessedContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchedVerses, setFetchedVerses] = useState([]);
  const [fetchedContent, setFetchedContent] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);

  const religions = [
    { value: 'hinduism', label: 'Hinduism', contentLabel: 'Add Shlok' },
    { value: 'islam', label: 'Islam', contentLabel: 'Add Verse' },
    { value: 'christianity', label: 'Christianity', contentLabel: 'Add Verse' },
    { value: 'buddhism', label: 'Buddhism', contentLabel: 'Add Teaching' },
    { value: 'sikhism', label: 'Sikhism', contentLabel: 'Add Shabad' },
    { value: 'judaism', label: 'Judaism', contentLabel: 'Add Verse' },
    { value: 'taoism', label: 'Taoism', contentLabel: 'Add Saying' },
    { value: 'jainism', label: 'Jainism', contentLabel: 'Add Sutra' },
    { value: 'zoroastrianism', label: 'Zoroastrianism', contentLabel: 'Add Verse' },
    { value: 'bahai', label: 'Baha’i Faith', contentLabel: 'Add Teaching' },
    { value: 'shinto', label: 'Shinto', contentLabel: 'Add Proverb' },
    { value: 'confucianism', label: 'Confucianism', contentLabel: 'Add Saying' },
    { value: 'zen', label: 'Zen (Chan Buddhism)', contentLabel: 'Add Saying' }
  ];

  const contentTypes = [
    { value: 'quote', label: 'Quotes', contentLabel: 'Add Quote' },
    { value: 'daily-tasks', label: 'Daily Tasks', contentLabel: 'Add Daily Task' },
    { value: 'article', label: 'Articles', contentLabel: 'Add Article' },
    { value: 'health-tips', label: 'Health Tips', contentLabel: 'Add Health Tips' },
    { value: 'food-tips', label: 'Food Tips', contentLabel: 'Add Food Tips' }
  ];


  const getContentLabel = () => {
    const religion = religions.find(r => r.value === selectedReligion);
    return religion ? religion.contentLabel : 'Add Content';
  };

  const getContentTypeLabel = () => {
    const contentType = contentTypes.find(r => r.value === selectedContentType);
    return contentType ? contentType.contentLabel : 'Add Content';
  };

  const handleReligionChange = (religion) => {
    setSelectedReligion(religion);
    // Reset content items when religion changes
    setContentItems([{ id: 1, text: '' }]);
    setNextId(2);
  };

  const handleContentTypeChange = (contType) => {
    setSelectedContentType(contType);
    handleShowContent(contType);
    // Reset content items when religion changes
    setContentItems([{ id: 1, text: '' }]);
    setNextId(2);
  };

  const handleContentChange = (id, value) => {
    setContentItems(contentItems.map(item => 
      item.id === id ? { ...item, text: value } : item
    ));
  };

  const addContentItem = () => {
    setContentItems([...contentItems, { id: nextId, text: '', is_processed: false }]);
    setNextId(nextId + 1);
  };

  const removeContentItem = (id) => {
    if (contentItems.length > 1) {
      setContentItems(contentItems.filter(item => item.id !== id));
    }
  };

  const handleSave = async () => {
    if (!selectedReligion) {
      alert("Please select a religion");
      return;
    }

    const validContent = contentItems.filter(item => item.text.trim() !== "");
    if (validContent.length === 0) {
      alert("Please add at least one content item");
      return;
    }

    var anyUnprocessed = false
    for (const item of validContent) {
      if (!item.is_processed) {
        anyUnprocessed=true
      }
    }

    if (anyUnprocessed){
      var cont = window.confirm("Some Items are not processed do you want to continue ?");
      if (cont) {
        for (const item of validContent) {
          setLoading(true);
          const output = await processVerse(item.text, selectedReligion);
          if (output.is_valid) {
            const result = await addVerse(selectedReligion, output.actual_content, output.question, output.translation_english, output.translation_hindi, output.motivation);
            if (!result.success) {
              setLoading(false);
              alert("Error saving one of the verses!");
              return;
            }
          }
          setLoading(false);
        }
        alert("✅ Content Proccessed and Saved!");
        // Clear frontend
        setSelectedReligion("");
        setContentItems([{ id: 1, text: "" }]);
        setNextId(2);
      }
    }
    else {
      for (const item of processedContent) {
        if (item.text.is_valid){
          const result = await addVerse(selectedReligion, item.text.actual_content, item.text.question, item.text.translation_english, item.text.translation_hindi, item.text.motivation);
          if (!result.success) {
            alert("Error saving one of the verses!");
            return;
          }
        }
      }
      alert("✅ All valid content saved successfully!");
      // Clear frontend
      setSelectedReligion("");
      setContentItems([{ id: 1, text: "" }]);
      setNextId(2);
    }
  };
  
  const handleProcessAll = async () => {
    if (!selectedReligion) {
      alert("Please select a religion!");
      return;
    }

    const validContent = contentItems.filter(item => item.text.trim() !== "");
    if (validContent.length === 0) {
      alert("No content to process!");
      return;
    }

    setLoading(true);

    const results = [];
    const updatedContentItems = [...contentItems];

    for (const item of validContent) {
      try {
        const output = await processVerse(item.text, selectedReligion);
        results.push({ id: item.id, text: output });
        // Mark item as processed
        const index = updatedContentItems.findIndex(i => i.id === item.id);
        if (index !== -1) updatedContentItems[index].is_processed = true;
      } catch (err) {
        console.error("Error processing:", item.text, err);
        results.push({ id: item.id, text: "Error processing content" });
      }
    }

    setProcessedContent(results);
    setContentItems(updatedContentItems);
    setLoading(false);
  };

  const handleShowVerses = async (religion) => {
    setSelectedReligion(religion);
    setLoading(true);
    const verses = await getVersesByReligion(religion);
    setFetchedVerses(Object.values(verses));
    setLoading(false);
  };

  const handleContentSave = async () => {
    if (!selectedContentType) {
      alert("Please select a content type");
      return;
    }

    const validContent = contentItems.filter(item => item.text.trim() !== "");
    if (validContent.length === 0) {
      alert("Please add at least one content item");
      return;
    }

    for (const item of validContent) {
      if (item.text){
        const result = await addOtherContent(selectedContentType, item.text);
        if (!result.success) {
          alert("Error saving one of the verses!");
          return;
        }
      }
    }
    
    handleShowContent(selectedContentType);
    setContentItems([{ id: 1, text: "" }]);
    setNextId(2);
  };

  const handleShowContent = async (contType) => {
    setLoading(true);
    const content = await showOtherContent(contType);
    setFetchedContent(Object.values(content));
    console.log(Object.values(content));
    setLoading(false);
  };

  const handleDeleteContent = async (contId) => {
    setLoading(true);
    const err = await removeOtherContent(selectedContentType,contId);
    if(!err.success){
      alert("Error in deletion!")
    }
    handleShowContent(selectedContentType);
    setLoading(false);
  }

  const handleFileChange = (e, filetype = 'image') => {
    const newFiles = Array.from(e.target.files);
    let allowedTypes = [];

    if (filetype === 'image') {
      allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
    } else if (filetype === 'video') {
      allowedTypes = ["video/mp4", "video/quicktime", "video/mov", "video/webm"];
    }

    const validFiles = newFiles.filter((file) => allowedTypes.includes(file.type));

    const invalidFiles = newFiles.filter((file) => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      alert(`❌ Invalid file(s): ${invalidFiles.map((f) => f.name).join(", ")}\nOnly ${filetype} formats are allowed.`);
    }

    setSelectedFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  const handleRemoveFile = (fileName) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select images to upload!");
      return;
    }

    setLoading(true);
    const progress = {};
    const uploaded = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      if (!file.type.startsWith("image/")) {
        console.warn(`Skipping non-image file: ${file.name}`);
        continue;
      }

      try {
        const result = await uploadMotivationalImages(file, (percent) => {
          progress[file.name] = percent;
          setUploadProgress({ ...progress });
        });

        if (result.success) {
          uploaded.push({ url: result.url, name: file.name });

          setSelectedFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name));

          setUploadProgress((prev) => {
            const updated = { ...prev };
            delete updated[file.name];
            return updated;
          });
        }
      } catch (error) {
        console.error("Upload failed for", file.name, error);
      }
    }

    setUploadedImages((prev) => [...prev, ...uploaded]);
    setLoading(false);

    if (uploaded.length > 0) {
      alert("✅ All selected files uploaded successfully!");
    }
  };

  const handleUploadVideos = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select videos to upload!");
      return;
    }

    setLoading(true);
    const progress = {};
    const uploaded = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      if (!file.type.startsWith("video/")) {
        console.warn(`Skipping non-video file: ${file.name}`);
        continue;
      }

      try {
        const result = await uploadMotivationalVideos(file, (percent) => {
          progress[file.name] = percent;
          setUploadProgress({ ...progress });
        });

        if (result.success) {
          uploaded.push({ url: result.url, name: file.name });

          setSelectedFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name));

          setUploadProgress((prev) => {
            const updated = { ...prev };
            delete updated[file.name];
            return updated;
          });
        }
      } catch (error) {
        console.error("Upload failed for", file.name, error);
      }
    }

    setUploadedVideos((prev) => [...prev, ...uploaded]);
    setLoading(false);

    if (uploaded.length > 0) {
      alert("✅ All selected files uploaded successfully!");
    }
  };

  return (
    <div className={styles['admin-content-page']}>
      {/* Header */}
      <Navbar pageName='Admin Controls' buttons={[{label: "Log Out", variant: "primary", route: "/"}]} Icon={Controls} />

      {/* Main Content */}
      <div className={styles['admin-main-content']}>
        <div className={styles['mode-buttons']}>
          <button
            className={`${styles['mode-btn']} ${viewMode === 'addVerse' ? styles.active : ''}`}
            onClick={() => setViewMode('addVerse')}
          >
            Add Verse
          </button>
          <button
            className={`${styles['mode-btn']} ${viewMode === 'showVerse' ? styles.active : ''}`}
            onClick={() => setViewMode('showVerse')}
          >
            Show Verse
          </button>
          <button
            className={`${styles['mode-btn']} ${viewMode === 'otherContent' ? styles.active : ''}`}
            onClick={() => setViewMode('otherContent')}
          >
            Content
          </button>
          <button
            className={`${styles['mode-btn']} ${viewMode === 'motivational_images' ? styles.active : ''}`}
            onClick={() => setViewMode('motivational_images')}
          >
            Motivational Images
          </button>
          <button
            className={`${styles['mode-btn']} ${viewMode === 'motivational_videos' ? styles.active : ''}`}
            onClick={() => setViewMode('motivational_videos')}
          >
            Motivational Videos
          </button>
          <button
            className={`${styles['mode-btn']} ${viewMode === 'background-effects' ? styles.active : ''}`}
            onClick={() => setViewMode('background-effects')}
          >
            Background Images and Video Effects
          </button>
        </div>
        <div className={styles['admin-card']}>
          {/* Add Verse Content */}
          {viewMode === 'addVerse' && (
            <>
              <div className={styles['admin-card-header']}>
                <h2 className={styles['admin-card-title']}>
                  {viewMode === 'addVerse' ? 'Add Verse' : ''}
                </h2>
              </div>

              {/* Religion Selection */}
              {/* All Visible */}
              <div className={clsx(styles['religion-section'],styles['all-visible'])}>
                <label className={styles['section-label']}>Choose Religion</label>
                <div className={styles['religion-buttons']}>
                  {religions.map((religion) => (
                    <button
                      key={religion.value}
                      className={`${styles['religion-btn']} ${selectedReligion === religion.value ? styles.active : ''}`}
                      onClick={() => handleReligionChange(religion.value)}
                    >
                      {religion.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Select Container */}
              <div className={clsx(styles['religion-section'],styles['select-container'])}>
                <label className={styles['section-label']}>Choose Religion</label>
                <select
                  className={styles['religion-select']}
                  value={selectedReligion}
                  onChange={(e) => handleReligionChange(e.target.value)}
                >
                  <option value="">Select Religion</option>
                  {religions.map((religion) => (
                    <option key={religion.value} value={religion.value}>
                      {religion.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Input Section */}
              {selectedReligion && (
                <div className={styles['content-section']}>
                  <div className={styles['content-header']}>
                    <label className={styles['section-label']}>{getContentLabel()}</label>
                  </div>

                  <div className={styles['content-items-list']}>
                    {contentItems.map((item, index) => (
                      <div key={item.id} className={styles['content-item']}>
                        <div className={styles['content-item-header']}>
                          <span className={styles['content-number']}>#{index + 1}</span>
                          {contentItems.length > 1 && (
                            <button
                              className={styles['remove-btn']}
                              onClick={() => removeContentItem(item.id)}
                              title="Remove this item"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <textarea
                          className={styles['content-textarea']}
                          placeholder={`${getContentLabel()} here...`}
                          value={item.text}
                          onChange={(e) => handleContentChange(item.id, e.target.value)}
                          rows={4}
                        />
                      </div>
                    ))}
                    <button className={styles['add-more-btn']} onClick={addContentItem}>
                      <Plus size={18} />
                      <span>Add More</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedReligion && (
                <div className={styles['action-buttons']}>
                  <button className={styles['cancel-btn']} onClick={() => {
                    setSelectedReligion('');
                    setContentItems([{ id: 1, text: '' }]);
                    setNextId(2);
                  }}>
                    Cancel
                  </button>
                  <button className={styles['save-btn']} onClick={handleSave}>
                    <Save size={18} />
                    <span>Save Content</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Show Verse Content */}
          {viewMode === 'showVerse' && (
            <>
              <div className={styles['admin-card-header']}>
                <h2 className={styles['admin-card-title']}>
                  {viewMode === 'showVerse' ? 'Show Verse' : ''}
                </h2>
              </div>

              {/* All Visible */}
              <div className={clsx(styles['religion-section'], styles['all-visible'])}>
                <label className={styles['section-label']}>Select Religion</label>
                <div className={styles['religion-buttons']}>
                  {religions.map((religion) => (
                    <button
                      key={religion.value}
                      className={`${styles['religion-btn']} ${selectedReligion === religion.value ? styles.active : ''}`}
                      onClick={() => handleShowVerses(religion.value)}
                    >
                      {religion.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Select Container */}
              <div className={clsx(styles['religion-section'],styles['select-container'])}>
                <label className={styles['section-label']}>Choose Religion</label>
                <select
                  className={styles['religion-select']}
                  value={selectedReligion}
                  onChange={(e) => handleShowVerses(e.target.value)}
                >
                  <option value="">Select Religion</option>
                  {religions.map((religion) => (
                    <option key={religion.value} value={religion.value}>
                      {religion.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReligion && (
                <div className={styles['show-content-section']}>
                  <h3 className={styles['section-subtitle']}>
                    Showing Verses for {religions.find(r => r.value === selectedReligion)?.label}
                  </h3>
                  <div className={styles['verse-list']}>
                    {fetchedVerses.length > 0 ? (
                      fetchedVerses.map((verse, index) => (
                        <div key={index} className={styles['verse-card']}>
                          <p><strong>ID:</strong> {verse.id}</p>
                          <p><strong>Original:</strong> {verse.actual_content}</p>
                          <p><strong>Question:</strong> {verse.question}</p>
                          <p><strong>English:</strong> {verse.eng_translation}</p>
                          <p><strong>Hindi:</strong> {verse.hi_translation}</p>
                          <p><strong>Motivation:</strong> {verse.explanation}</p>
                        </div>
                      ))
                    ) : (
                      <p className={styles['no-content']}>No verses found for this religion.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Add Content */}
          {viewMode === 'otherContent'  && (
            <>
              <div className={styles['admin-card-header']}>
                <h2 className={styles['admin-card-title']}>
                  {viewMode === 'otherContent' ? 'Add Content' : ''}
                </h2>
              </div>

              {/* ContentType Selection */}
              {/* All Visible */}
              <div className={clsx(styles['religion-section'],styles['all-visible'])}>
                <label className={styles['section-label']}>Choose Content Type</label>
                <div className={styles['religion-buttons']}>
                  {contentTypes.map((contType) => (
                    <button
                      key={contType.value}
                      className={`${styles['religion-btn']} ${selectedContentType === contType.value ? styles.active : ''}`}
                      onClick={() => handleContentTypeChange(contType.value)}
                    >
                      {contType.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Select Container */}
              <div className={clsx(styles['religion-section'],styles['select-container'])}>
                <label className={styles['section-label']}>Choose Content Type</label>
                <select
                  className={styles['religion-select']}
                  value={selectedContentType}
                  onChange={(e) => handleContentTypeChange(e.target.value)}
                >
                  <option value="">Select Content Type</option>
                  {contentTypes.map((contType) => (
                    <option key={contType.value} value={contType.value}>
                      {contType.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Content Input Section */}
              {selectedContentType && (
                <div className={styles['content-section']}>
                  <div className={styles['content-header']}>
                    <label className={styles['section-label']}>{getContentTypeLabel()}</label>
                  </div>

                  <div className={styles['content-items-list']}>
                    {contentItems.map((item, index) => (
                      <div key={item.id} className={styles['content-item']}>
                        <div className={styles['content-item-header']}>
                          <span className={styles['content-number']}>#{index + 1}</span>
                          {contentItems.length > 1 && (
                            <button
                              className={styles['remove-btn']}
                              onClick={() => removeContentItem(item.id)}
                              title="Remove this item"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <textarea
                          className={styles['content-textarea']}
                          placeholder={`${getContentTypeLabel()} here...`}
                          value={item.text}
                          onChange={(e) => handleContentChange(item.id, e.target.value)}
                          rows={4}
                        />
                      </div>
                    ))}
                    <button className={styles['add-more-btn']} onClick={addContentItem}>
                      <Plus size={18} />
                      <span>Add More</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedContentType && (
                <div className={styles['action-buttons']}>
                  <button className={styles['cancel-btn']} onClick={() => {
                    setSelectedContentType('');
                    setContentItems([{ id: 1, text: '' }]);
                    setNextId(2);
                  }}>
                    Cancel
                  </button>
                  <button className={styles['save-btn']} onClick={handleContentSave}>
                    <Save size={18} />
                    <span>Save Content</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Add Motivational Images */}
          {viewMode === 'motivational_images' && (
          <div className={styles['motivational-section']}>
            <h2 className={styles['admin-card-title']}>Upload Motivational Images</h2>
            
            <div className={styles['upload-box']}>
              <label htmlFor="fileInput" className={styles['add-files-btn']}>
                + Add Files
              </label>
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e, 'image')}
                style={{ display: 'none' }}
              />
              <button className={styles['save-btn']} onClick={handleUploadImages}>
                <Save size={18} /> <span>Upload All</span>
              </button>
            </div>

            {/* Waiting Files List */}
            {selectedFiles.length > 0 && (
              <div className={styles['upload-progress-window']}>
                <h3>Files Waiting for Upload:</h3>
                {selectedFiles.map((file, index) => (
                  <div key={index} className={styles['upload-progress-item']}>
                    <div className={styles['progress-info']}>
                      <span>{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(file.name)}
                        className={styles['trash-btn']}
                        title="Remove this file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <progress value={uploadProgress[file.name] || 0} max="100" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Add Motivational Videos */}
          {viewMode === 'motivational_videos' && (
          <div className={styles['motivational-section']}>
            <h2 className={styles['admin-card-title']}>Upload Motivational Videos</h2>
            
            <div className={styles['upload-box']}>
              <label htmlFor="fileInput" className={styles['add-files-btn']}>
                + Add Files
              </label>
              <input
                id="fileInput"
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => handleFileChange(e, 'video')}
                style={{ display: 'none' }}
              />
              <button className={styles['save-btn']} onClick={handleUploadVideos}>
                <Save size={18} /> <span>Upload All</span>
              </button>
            </div>

            {/* Waiting Files List */}
            {selectedFiles.length > 0 && (
              <div className={styles['upload-progress-window']}>
                <h3>Files Waiting for Upload:</h3>
                {selectedFiles.map((file, index) => (
                  <div key={index} className={styles['upload-progress-item']}>
                    <div className={styles['progress-info']}>
                      <span>{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(file.name)}
                        className={styles['trash-btn']}
                        title="Remove this file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <progress value={uploadProgress[file.name] || 0} max="100" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>

        {/* Preview Section */}
        {viewMode === 'addVerse' && selectedReligion && contentItems.some(item => item.text.trim() !== '') && (
          <div className={styles['preview-card']}>
            <div className={styles['preview-header']}>
              <h3 className={styles['preview-title']}>Preview</h3>
              <button className={styles['process-btn']} onClick={handleProcessAll}>
                {loading ? "Processing..." : "Process Content"}
              </button>
            </div>
            <div className={styles['preview-content']}>
              <p className={styles['preview-religion']}>
                <strong>Religion:</strong> {religions.find(r => r.value === selectedReligion)?.label}
              </p>
              <div className={styles['preview-items']}>
                {contentItems
                  .filter(item => item.text.trim() !== '')
                  .map((item, index) => (
                    <div key={item.id} className={styles['preview-item']}>
                      <span className={styles['preview-number']}>{index + 1}.</span>
                        <div className={styles['preview-text']}>
                          {!contentItems.find(p => p.id === item.id)?.is_processed ? <p>"{item.text}" is not proccessed yet!</p> : 
                          <div>
                            {processedContent.find(p => p.id === item.id)?.text.is_valid ? 
                              <div>
                                <p><strong>Original:</strong> {processedContent.find(p => p.id === item.id)?.text.actual_content}</p>
                                <p><strong>English:</strong> {processedContent.find(p => p.id === item.id)?.text.translation_english}</p>
                                <p><strong>Hindi:</strong> {processedContent.find(p => p.id === item.id)?.text.translation_hindi}</p>
                                <p><strong>Question:</strong> {processedContent.find(p => p.id === item.id)?.text.question}</p>
                                <p><strong>Motivation:</strong> {processedContent.find(p => p.id === item.id)?.text.motivation}</p>
                              </div>
                              : <p>"{item.text}"" is not Valid Content!!!</p>}
                          </div>
                          }
                        </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Display Section */}
        {viewMode === 'otherContent' && selectedContentType && (
          <div className={styles['preview-card']}>
            <div className={styles['preview-header']}>
              <h3 className={styles['preview-title']}>Delete Content</h3>
            </div>
            
            {selectedContentType && (
              <div className={styles['preview-content']}>
                <p>
                  <strong>Content Type :</strong> {contentTypes.find(r => r.value === selectedContentType)?.label}
                </p>
                <div className={styles['preview-items']}>
                  {fetchedContent.length > 0 ? (
                    fetchedContent.map((cont, index) => (
                      <div key={index} className={styles['cont-card']}>
                        <p><pre><strong>{index}:      </strong>{cont.actual_content}</pre></p>
                        <button
                          className={styles['remove-btn']}
                          onClick={() => handleDeleteContent(cont.id)}
                          title="Remove this item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className={styles['no-content']}>No content found for {selectedContentType}.</p>
                  )}
                </div>
              </div>
            )}
            </div>
        )}

        {/* Uploaded Preview */}
        {viewMode === 'motivational_images' && uploadedImages.length > 0 && (
          <div className={styles['preview-card']}>
            <h3 className={styles['preview-header']}>Uploaded Images:</h3>
            <div className={styles['preview-grid']}>
              {uploadedImages.map((file, index) => (
                <div key={index} className={styles['preview-img-container']}>
                  <a 
                    key={index} 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  ><img src={file.url} alt={file.name} className={styles['preview-img']} /></a>
                  <span className={styles['preview-filename']}>{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {viewMode === 'motivational_videos' && uploadedVideos.length > 0 && (
          <div className={styles['preview-card']}>
            <h3 className={styles['preview-header']}>Uploaded Videos:</h3>
            <div className={styles['preview-items']}>
              {uploadedVideos.map((file, index) => (
                <div key={index} className={styles['video-item']}>
                  <span>{file.name}</span>
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles['download-btn']}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {loading && (
        <div className={styles["loader-overlay"]}>
          <div className={styles["spinner"]}></div>
        </div>
      )}
    </div>
  );
}