import { useEffect, useMemo, useState } from "react";
import { getUiSchema, runSkillStream } from "../api/client";
import type { Language, LlmConfig, RunSkillResult, SkillSummary, UiField, UiSchemaResponse } from "../api/types";
import { OutputTabs } from "../components/OutputTabs";
import { t } from "../features/i18n/text";

interface RunSkillPageProps {
  language: Language;
  skills: SkillSummary[];
  invalidSkills: SkillSummary[];
  selectedSkillId: string;
  config: LlmConfig;
  onSkillChange: (skillId: string) => void;
  onLanguageChange: (language: Language) => void;
  onRunComplete: () => void;
  setStatus: (message: string, tone?: "ok" | "warn" | "error") => void;
}

function fieldId(field: UiField) {
  return field.id || field.name || field.key || "";
}

function labelFor(field: UiField, language: Language) {
  return (language === "th" ? field.labelTh : field.label) || field.label || fieldId(field);
}

function helpFor(field: UiField, language: Language) {
  return (language === "th" ? field.helpTextTh : field.helpText) || field.description || "";
}

function optionValue(option: string | number | { value?: string | number; id?: string; label?: string; name?: string }) {
  return typeof option === "string" || typeof option === "number" ? String(option) : String(option.value || option.id || option.label || option.name || "");
}

function optionLabel(option: string | number | { value?: string | number; id?: string; label?: string; labelTh?: string; name?: string }, language: Language) {
  return typeof option === "string" || typeof option === "number" ? String(option) : String((language === "th" ? option.labelTh : option.label) || option.label || option.name || option.value || "");
}

function skillTitleFor(skill: SkillSummary, language: Language) {
  return (language === "th" ? skill.titleTh : skill.title) || skill.title;
}

function skillDescriptionFor(skill: SkillSummary | undefined, language: Language) {
  if (!skill) return t(language, "schemaDrivenRuntime");
  return (language === "th" ? skill.descriptionTh : skill.description) || skill.description || t(language, "schemaDrivenRuntime");
}

function defaultFor(field: UiField): unknown {
  if (field.default !== undefined) return field.default;
  if (field.type === "number") return "";
  if (field.type === "checkbox" || field.type === "boolean") return false;
  if (field.type === "multiselect" || field.type === "list") return [];
  if (field.type === "object") return Object.fromEntries((field.fields || []).map((child) => [fieldId(child), defaultFor(child)]).filter(([id]) => id));
  if (field.type === "array") return [];
  if (field.type === "images" || field.type === "imageUpload") return [];
  return "";
}

function displayValueFor(field: UiField, value: unknown) {
  if (field.format === "json" && (Array.isArray(value) || (value && typeof value === "object"))) {
    return JSON.stringify(value, null, 2);
  }
  return String(value || "");
}

function valueForForm(field: UiField) {
  const value = defaultFor(field);
  return field.format === "json" && (Array.isArray(value) || (value && typeof value === "object"))
    ? JSON.stringify(value, null, 2)
    : value;
}

function parseJsonFieldValue(field: UiField, value: unknown) {
  if (field.format !== "json" || typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw) return "";
  try {
    return JSON.parse(raw);
  } catch {
    return value;
  }
}

function normalizeFormValue(field: UiField, value: unknown): unknown {
  if (field.type === "object") {
    const current = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    return Object.fromEntries((field.fields || []).map((child) => {
      const id = fieldId(child);
      return [id, normalizeFormValue(child, current[id] ?? defaultFor(child))];
    }).filter(([id]) => id));
  }
  if (field.type === "array") {
    return Array.isArray(value) ? value.map((item) => normalizeFormValue({ ...field, type: "object", fields: field.itemFields }, item)) : [];
  }
  if (field.type === "list" || field.type === "multiselect" || isImageField(field)) {
    return Array.isArray(value) ? value : [];
  }
  return parseJsonFieldValue(field, value);
}

function maxImagesFor(field: UiField) {
  if (typeof field.maxImages === "number" && field.maxImages > 0) return field.maxImages;
  return field.multiple === false ? 1 : 20;
}

function fieldsFromSchema(schema: UiSchemaResponse | null) {
  if (!schema) return [];
  const sectionFields = schema.uiSchema?.sections?.flatMap((section) => section.fields || []) || [];
  const directFields = schema.uiSchema?.fields || schema.fields || [];
  return sectionFields.length ? sectionFields : directFields;
}

function sectionsFromSchema(schema: UiSchemaResponse | null) {
  if (!schema) return [];
  const sections = schema.uiSchema?.sections || [];
  if (sections.length) return sections;
  const directFields = schema.uiSchema?.fields || schema.fields || [];
  return directFields.length ? [{ id: "inputs", title: t("en", "inputs"), titleTh: t("th", "inputs"), fields: directFields }] : [];
}

function extractRequired(schema: UiSchemaResponse | null) {
  return new Set(schema?.inputSchema?.required || schema?.schema?.required || []);
}

function hasConfiguredLlm(config: LlmConfig) {
  return config.fallback.some((item) => {
    const provider = config.providers[item.provider];
    const model = item.model === "__custom__" ? item.customModel : item.model;
    return Boolean(provider?.baseUrl && model && (provider.apiKey || provider.hasApiKey));
  });
}

function isImageField(field: UiField) {
  return field.type === "images" || field.type === "imageUpload" || field.input === "image";
}

interface OptimizedImagePayload {
  type: "image";
  dataUrl: string;
  name: string;
  mimeType: string;
  size: number;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
}

function imageSrc(value: unknown) {
  if (typeof value === "string") return value.startsWith("data:image/") ? value : "";
  if (value && typeof value === "object" && typeof (value as { dataUrl?: unknown }).dataUrl === "string") {
    const dataUrl = (value as { dataUrl: string }).dataUrl;
    return dataUrl.startsWith("data:image/") ? dataUrl : "";
  }
  return "";
}

const visionImageMaxDimension = 1024;
const visionImageQuality = 0.72;

function dataUrlByteSize(dataUrl: string) {
  const base64 = dataUrl.split(",", 2)[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

async function fileToOptimizedImage(file: File, language: Language): Promise<OptimizedImagePayload> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(t(language, "unableToReadImageFile")));
    };
    img.src = url;
  });

  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, visionImageMaxDimension / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(t(language, "unableToReadImageFile"));
  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", visionImageQuality);

  return {
    type: "image",
    dataUrl,
    name: file.name,
    mimeType: "image/jpeg",
    size: dataUrlByteSize(dataUrl),
    originalSize: file.size,
    originalWidth,
    originalHeight,
    width,
    height
  };
}

async function filesToImagePayloads(files: FileList | null, language: Language) {
  if (!files) return [];
  return Promise.all(Array.from(files).map((file) => fileToOptimizedImage(file, language)));
}

interface ImageUploadControlProps {
  field: UiField;
  language: Language;
  value: unknown;
  onChange: (value: string | OptimizedImagePayload | OptimizedImagePayload[]) => void;
}

function ImageUploadControl({ field, language, value, onChange }: ImageUploadControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const maxImages = maxImagesFor(field);
  const images = Array.isArray(value)
    ? value.filter((item): item is OptimizedImagePayload => Boolean(imageSrc(item)))
    : imageSrc(value)
      ? [value as OptimizedImagePayload]
      : [];
  const isSingle = field.multiple === false || maxImages === 1;

  async function addFiles(files: FileList | null) {
    const next = await filesToImagePayloads(files, language);
    const limited = (isSingle ? next.slice(0, 1) : [...images, ...next].slice(0, maxImages)).filter(Boolean);
    onChange(isSingle ? limited[0] || "" : limited);
  }

  function removeImage(index: number) {
    const next = images.filter((_, itemIndex) => itemIndex !== index);
    onChange(isSingle ? next[0] || "" : next);
  }

  return (
    <div className="image-upload">
      <label
        className={`file-picker image-dropzone${isDragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
      >
        <span>{t(language, "dropImagesHere")}</span>
        <small>{images.length ? t(language, "addReplaceImage") : t(language, "chooseImage")}</small>
        <input
          type="file"
          accept={field.accept || "image/*"}
          multiple={!isSingle}
          onChange={(event) => {
            const input = event.currentTarget;
            void addFiles(input.files).finally(() => {
              input.value = "";
            });
          }}
        />
      </label>
      {images.length ? (
        <div className="image-preview-grid">
          {images.map((src, index) => (
            <div className="image-preview" key={`${imageSrc(src).slice(0, 32)}-${index}`}>
              <img src={imageSrc(src)} alt="" />
              <button type="button" onClick={() => removeImage(index)}>{t(language, "remove")}</button>
            </div>
          ))}
        </div>
      ) : null}
      <small>{images.length ? t(language, "imagesAttached").replace("{count}", String(images.length)).replace("{max}", String(maxImages)) : t(language, "noImagesAttached").replace("{max}", String(maxImages))}</small>
    </div>
  );
}

export function RunSkillPage({
  language,
  skills,
  invalidSkills,
  selectedSkillId,
  config,
  onSkillChange,
  onLanguageChange,
  onRunComplete,
  setStatus
}: RunSkillPageProps) {
  const [schema, setSchema] = useState<UiSchemaResponse | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [schemaError, setSchemaError] = useState("");
  const [running, setRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState("");
  const [result, setResult] = useState<RunSkillResult | null>(null);
  const fields = useMemo(() => fieldsFromSchema(schema), [schema]);
  const sections = useMemo(() => sectionsFromSchema(schema), [schema]);
  const required = useMemo(() => extractRequired(schema), [schema]);

  useEffect(() => {
    if (!selectedSkillId) {
      setSchema(null);
      return;
    }
    let cancelled = false;
    setSchemaError("");
    setStatus(t(language, "loadingSchema"), "warn");
    getUiSchema(selectedSkillId)
      .then((next) => {
        if (cancelled) return;
        setSchema(next);
        const initial: Record<string, unknown> = {};
        for (const field of fieldsFromSchema(next)) {
          const id = fieldId(field);
          if (id) initial[id] = id === "ui_language" ? language : valueForForm(field);
        }
        setValues(initial);
        setStatus(t(language, "ready"), "ok");
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setSchemaError(error.message);
        setStatus(t(language, "error"), "error");
      });
    return () => {
      cancelled = true;
    };
  }, [language, selectedSkillId, setStatus]);

  function updateValue(id: string, value: unknown) {
    setValues((current) => ({ ...current, [id]: value }));
    if (id === "ui_language" && (value === "en" || value === "th")) {
      onLanguageChange(value);
    }
  }

  function renderHelp(field: UiField) {
    const help = helpFor(field, language);
    return (
      <div className="field-help">
        {help ? <small>{help}</small> : null}
        {field.example ? <small><strong>{t(language, "example")}</strong> {field.example}</small> : null}
      </div>
    );
  }

  function renderNestedControl(field: UiField, value: unknown, onChange: (next: unknown) => void) {
    const options = field.options || field.choices || field.enum || [];
    if (isImageField(field)) {
      return <ImageUploadControl field={field} language={language} value={value} onChange={onChange as (value: string | OptimizedImagePayload | OptimizedImagePayload[]) => void} />;
    }
    if (field.type === "object") {
      const current = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
      return (
        <div className="nested-control">
          {(field.fields || []).map((child) => {
            const childId = fieldId(child);
            if (!childId) return null;
            return (
              <div className="nested-field" key={childId}>
                <span className="field-label">{labelFor(child, language)}{child.required ? " *" : ""}</span>
                {renderNestedControl(child, current[childId] ?? valueForForm(child), (next) => onChange({ ...current, [childId]: next }))}
                {renderHelp(child)}
              </div>
            );
          })}
        </div>
      );
    }
    if (field.type === "array" && field.itemFields?.length) {
      const rows = Array.isArray(value) ? value as Record<string, unknown>[] : [];
      const blank = () => Object.fromEntries((field.itemFields || []).map((child) => [fieldId(child), valueForForm(child)]).filter(([id]) => id));
      return (
        <div className="repeater">
          {rows.map((row, index) => (
            <div className="repeater-item" key={index}>
              <div className="repeater-head">
                <strong>{field.itemLabel || t(language, "item")} {index + 1}</strong>
                <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>{t(language, "remove")}</button>
              </div>
              {(field.itemFields || []).map((child) => {
                const childId = fieldId(child);
                if (!childId) return null;
                return (
                  <div className="nested-field" key={childId}>
                    <span className="field-label">{labelFor(child, language)}{child.required ? " *" : ""}</span>
                    {renderNestedControl(child, row[childId] ?? valueForForm(child), (next) => {
                      const nextRows = rows.map((item, rowIndex) => rowIndex === index ? { ...item, [childId]: next } : item);
                      onChange(nextRows);
                    })}
                    {renderHelp(child)}
                  </div>
                );
              })}
            </div>
          ))}
          <button type="button" className="link-button" onClick={() => onChange([...rows, blank()])}>
            {t(language, "addItem")} {field.itemLabel || t(language, "item")}
          </button>
        </div>
      );
    }
    if (field.type === "multiselect") {
      const selected = new Set((Array.isArray(value) ? value : []).map(String));
      return (
        <div className="choice-grid">
          {options.map((option) => {
            const optionId = optionValue(option);
            return (
              <label className="choice" key={optionId}>
                <input
                  type="checkbox"
                  checked={selected.has(optionId)}
                  onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) next.add(optionId);
                    else next.delete(optionId);
                    onChange(Array.from(next));
                  }}
                />
                <span>{optionLabel(option, language)}</span>
              </label>
            );
          })}
        </div>
      );
    }
    if (field.type === "list") {
      const rows = Array.isArray(value) ? value.map(String) : [];
      return (
        <div className="list-control">
          {rows.map((row, index) => (
            <div className="list-row" key={index}>
              <input value={row} onChange={(event) => onChange(rows.map((item, rowIndex) => rowIndex === index ? event.target.value : item))} />
              <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>{t(language, "remove")}</button>
            </div>
          ))}
          <button type="button" className="link-button" onClick={() => onChange([...rows, ""])}>{t(language, "addItem")}</button>
        </div>
      );
    }
    if (field.type === "textarea") {
      return <textarea rows={field.rows || 3} value={displayValueFor(field, value)} placeholder={(language === "th" ? field.placeholderTh : field.placeholder) || field.placeholder || ""} onChange={(event) => onChange(event.target.value)} />;
    }
    if (field.type === "select" || options.length) {
      return (
        <select value={String(value || "")} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option, language)}</option>)}
        </select>
      );
    }
    if (field.type === "number") {
      return <input type="number" min={field.min} max={field.max} step={field.step || 1} value={String(value ?? "")} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : "")} />;
    }
    if (field.type === "boolean" || field.type === "checkbox") {
      return <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />;
    }
    return <input value={String(value || "")} placeholder={(language === "th" ? field.placeholderTh : field.placeholder) || field.placeholder || ""} onChange={(event) => onChange(event.target.value)} />;
  }

  function validate() {
    for (const field of fields) {
      const id = fieldId(field);
      if (!id) continue;
      const value = values[id];
      if ((field.required || required.has(id)) && (value === "" || value === null || value === undefined || (Array.isArray(value) && !value.length))) {
        return `${labelFor(field, language)} is required.`;
      }
    }
    return "";
  }

  async function runSkill(samplePayload?: Record<string, unknown>) {
    const error = samplePayload ? "" : validate();
    if (error) {
      setRuntimeStatus(error);
      setStatus(t(language, "needsInput"), "warn");
      return;
    }
    const params = samplePayload || fields.reduce<Record<string, unknown>>((payload, field) => {
      const id = fieldId(field);
      if (id) payload[id] = normalizeFormValue(field, values[id]);
      return payload;
    }, {});
    setRunning(true);
    setRuntimeStatus(t(language, "starting"));
    setResult(null);
    setStatus(t(language, "running"), "warn");
    try {
      const next = await runSkillStream({ skillId: selectedSkillId, params, llmConfig: config }, (status) => {
        setRuntimeStatus(status.message || status.phase || t(language, "running"));
      });
      setResult(next);
      setStatus(t(language, "completed"), "ok");
      onRunComplete();
    } catch (error) {
      setRuntimeStatus(error instanceof Error ? error.message : t(language, "skillRunFailed"));
      setStatus(t(language, "error"), "error");
    } finally {
      setRunning(false);
    }
  }

  function resetForm() {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      const id = fieldId(field);
      if (id) initial[id] = valueForForm(field);
    }
    setValues(initial);
    setResult(null);
    setRuntimeStatus("");
    setStatus(t(language, "ready"), "ok");
  }

  function thaiCatsSample() {
    const payload = {
      topic: "แมวไทยสามสีในชุดผ้าไหม เดินเล่นในตลาดน้ำ บรรยากาศภาพยนตร์ แสงเย็น",
      target_language: "th",
      aspect_ratio: "4:5",
      image_style: "cinematic",
      n: 1
    };
    setValues((current) => ({ ...current, ...payload }));
    void runSkill(payload);
  }

  return (
    <section className="page run-page">
      <div className="page-head">
        <div>
          <h2>{t(language, "runSkill")}</h2>
          <p>{skillDescriptionFor(schema?.skill, language)}</p>
        </div>
        <button type="button" className="primary" disabled={running || !selectedSkillId} onClick={() => void runSkill()}>
          {running ? t(language, "starting") : t(language, "run")}
        </button>
      </div>

      <label className="skill-select">
        <span>{t(language, "chooseSkill")}</span>
        <select value={selectedSkillId} onChange={(event) => onSkillChange(event.target.value)} aria-label={t(language, "chooseSkill")}>
          {skills.map((skill) => <option key={skill.id} value={skill.id}>{skillTitleFor(skill, language)}</option>)}
          {invalidSkills.map((skill) => <option key={skill.id} value={skill.id} disabled>{skillTitleFor(skill, language)}{t(language, "invalidSkillSuffix")}</option>)}
        </select>
      </label>

      {schemaError ? <p className="alert">{schemaError}</p> : null}
      {schema?.skill && !schema.skill.hasRuntime && !hasConfiguredLlm(config) ? (
        <p className="warning">{t(language, "noLocalRuntime")}</p>
      ) : null}

      <div className="workbench">
        <form className="dynamic-form" onSubmit={(event) => { event.preventDefault(); void runSkill(); }}>
          {sections.map((section, index) => {
            const title = (language === "th" ? section.titleTh : section.title) || section.title || "";
            const body = (
              <div className="section-fields">
                {(section.fields || []).map((field) => {
                  const id = fieldId(field);
                  if (!id) return null;
                  const value = values[id];
                  return (
                    <div className="field" key={id}>
                      <span className="field-label">{labelFor(field, language)}{field.required || required.has(id) ? " *" : ""}</span>
                      {renderNestedControl(field, value, (next) => updateValue(id, next))}
                      {renderHelp(field)}
                    </div>
                  );
                })}
              </div>
            );
            return section.collapsed ? (
              <details className="form-section" key={section.id || index}>
                <summary>{title}</summary>
                {body}
              </details>
            ) : (
              <section className="form-section" key={section.id || index}>
                {title ? <h3>{title}</h3> : null}
                {body}
              </section>
            );
          })}
          <div className="actions">
            <button type="submit" className="primary" disabled={running || !selectedSkillId}>{running ? t(language, "starting") : t(language, "run")}</button>
            <button type="button" onClick={resetForm}>{t(language, "reset")}</button>
            {selectedSkillId === "gpt-image-prompt-engineer" ? (
              <button type="button" onClick={thaiCatsSample}>{t(language, "sample")}</button>
            ) : null}
          </div>
          {runtimeStatus ? <p className="runtime-status">{runtimeStatus}</p> : null}
        </form>
        <OutputTabs language={language} result={result} placeholder={t(language, "chooseSkillPlaceholder")} />
      </div>
    </section>
  );
}
