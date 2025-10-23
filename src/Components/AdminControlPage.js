import React, { useState } from 'react';
import styles from './AdminControlPage.module.css';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { addVerse, getVersesByReligion } from "../services/contentService";
import { processVerse } from "../services/llmService";
import Navbar from "./Navbar";
import { ReactComponent as Controls } from "../assets/SettingsSlider.svg"
import clsx from 'clsx';

export default function AdminControlPage() {
  const [viewMode, setViewMode] = useState('add'); // 'add' or 'show'
  const [selectedReligion, setSelectedReligion] = useState('');
  const [contentItems, setContentItems] = useState([{ id: 1, text: '', is_processed: false}]);
  const [nextId, setNextId] = useState(2);
  const [processedContent, setProcessedContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchedVerses, setFetchedVerses] = useState([]);

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


  const getContentLabel = () => {
    const religion = religions.find(r => r.value === selectedReligion);
    return religion ? religion.contentLabel : 'Add Content';
  };

  const handleReligionChange = (religion) => {
    setSelectedReligion(religion);
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

  const handleShowContent = async (religion) => {
    setSelectedReligion(religion);
    setLoading(true);
    const verses = await getVersesByReligion(religion);
    setFetchedVerses(verses);
    setLoading(false);
  };

  return (
    <div className={styles['admin-content-page']}>
      {/* Header */}
      <Navbar pageName='Admin Controls' Icon={Controls} />

      {/* Main Content */}
      <div className={styles['admin-main-content']}>
        <div className={styles['mode-buttons']}>
          <button
            className={`${styles['mode-btn']} ${viewMode === 'add' ? styles.active : ''}`}
            onClick={() => setViewMode('add')}
          >
            Add Content
          </button>
          <button
            className={`${styles['mode-btn']} ${viewMode === 'show' ? styles.active : ''}`}
            onClick={() => setViewMode('show')}
          >
            Show Content
          </button>
        </div>
        <div className={styles['admin-card']}>
          <div className={styles['admin-card-header']}>
            <h2 className={styles['admin-card-title']}>
              {viewMode === 'add' ? 'Add Content' : 'Show Content'}
            </h2>
          </div>

          {/* Add Content */}
          {viewMode === 'add' && (
            <>
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

          {/* Show Content */}
          {viewMode === 'show' && (
            <>
              {/* All Visible */}
              <div className={clsx(styles['religion-section'], styles['all-visible'])}>
                <label className={styles['section-label']}>Select Religion</label>
                <div className={styles['religion-buttons']}>
                  {religions.map((religion) => (
                    <button
                      key={religion.value}
                      className={`${styles['religion-btn']} ${selectedReligion === religion.value ? styles.active : ''}`}
                      onClick={() => handleShowContent(religion.value)}
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
                  onChange={(e) => handleShowContent(e.target.value)}
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
        </div>

        {/* Preview Section */}
        {viewMode === 'add' && selectedReligion && contentItems.some(item => item.text.trim() !== '') && (
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
      </div>
      {loading && (
        <div className={styles["loader-overlay"]}>
          <div className={styles["spinner"]}></div>
        </div>
      )}
    </div>
  );
}