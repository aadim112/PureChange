import React, { useState } from 'react';
import styles from './AdminControlPage.module.css';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { addVerse } from "../services/contentService";
import { processVerse } from "../services/llmService";

export default function AdminControlPage() {
  const [selectedReligion, setSelectedReligion] = useState('');
  const [contentItems, setContentItems] = useState([{ id: 1, text: '', is_processed: false}]);
  const [nextId, setNextId] = useState(2);
  const [processedContent, setProcessedContent] = useState([]);
  const [loading, setLoading] = useState(false);

  const religions = [
    { value: 'hinduism', label: 'Hinduism', contentLabel: 'Add Shlok' },
    { value: 'islam', label: 'Islam', contentLabel: 'Add Verse' },
    { value: 'christianity', label: 'Christianity', contentLabel: 'Add Verse' },
    { value: 'buddhism', label: 'Buddhism', contentLabel: 'Add Teaching' },
    { value: 'sikhism', label: 'Sikhism', contentLabel: 'Add Shabad' }
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
          console.log(output)
          if (output.is_valid) {
            const result = await addVerse(selectedReligion, output.actual_content, output.translation_english, output.translation_hindi, output.motivation);
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
          const result = await addVerse(selectedReligion, item.text.actual_content, item.text.translation_english, item.text.translation_hindi, item.text.motivation);
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
        console.log(output)
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

  return (
    <div className={styles['admin-content-page']}>
      {/* Header */}
      <div className={styles['admin-header']}>
        <div className={styles['header-left']}>
          <FileText size={24} />
          <span>Admin Panel</span>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles['admin-main-content']}>
        <div className={styles['admin-card']}>
          <h2 className={styles['admin-card-title']}>Add Content</h2>

          {/* Religion Selection */}
          <div className={styles['religion-section']}>
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

          {/* Content Input Section */}
          {selectedReligion && (
            <div className={styles['content-section']}>
              <div className={styles['content-header']}>
                <label className={styles['section-label']}>{getContentLabel()}</label>
                <button className={styles['add-more-btn']} onClick={addContentItem}>
                  <Plus size={18} />
                  <span>Add More</span>
                </button>
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
                      placeholder={`Enter ${getContentLabel().toLowerCase()} here...`}
                      value={item.text}
                      onChange={(e) => handleContentChange(item.id, e.target.value)}
                      rows={4}
                    />
                  </div>
                ))}
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
        </div>

        {/* Preview Section */}
        {selectedReligion && contentItems.some(item => item.text.trim() !== '') && (
          <div className={styles['preview-card']}>
            <h3 className={styles['preview-title']}>Preview</h3>
            <button className={styles['process-btn']} onClick={handleProcessAll}>
              {loading ? "Processing..." : "Process Content"}
            </button>
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