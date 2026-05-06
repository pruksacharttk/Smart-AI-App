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
  return directFields.length ? [{ id: "inputs", title: "Inputs", titleTh: "ข้อมูลนำเข้า", fields: directFields }] : [];
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

async function filesToDataUrls(files: FileList | null) {
  if (!files) return [];
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error("Unable to read image file."));
          reader.readAsDataURL(file);
        })
    )
  );
}

interface ImageUploadControlProps {
  field: UiField;
  value: unknown;
  onChange: (value: string | string[]) => void;
}

function ImageUploadControl({ field, value, onChange }: ImageUploadControlProps) {
  const maxImages = maxImagesFor(field);
  const images = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item))
    : typeof value === "string" && value
      ? [value]
      : [];
  const isSingle = field.multiple === false || maxImages === 1;

  async function addFiles(files: FileList | null) {
    const next = await filesToDataUrls(files);
    const limited = (isSingle ? next.slice(0, 1) : [...images, ...next].slice(0, maxImages)).filter(Boolean);
    onChange(isSingle ? limited[0] || "" : limited);
  }

  function removeImage(index: number) {
    const next = images.filter((_, itemIndex) => itemIndex !== index);
    onChange(isSingle ? next[0] || "" : next);
  }

  return (
    <div className="image-upload">
      <label className="file-picker">
        <span>{images.length ? "Add / replace image" : "Choose image"}</span>
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
            <div className="image-preview" key={`${src.slice(0, 32)}-${index}`}>
              <img src={src} alt="" />
              <button type="button" onClick={() => removeImage(index)}>Remove</button>
            </div>
          ))}
        </div>
      ) : null}
      <small>{images.length ? `${images.length}/${maxImages} images attached` : `No images attached (${maxImages} max)`}</small>
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
    setStatus("Loading schema", "warn");
    getUiSchema(selectedSkillId)
      .then((next) => {
        if (cancelled) return;
        setSchema(next);
        const initial: Record<string, unknown> = {};
        for (const field of fieldsFromSchema(next)) {
          const id = fieldId(field);
          if (id) initial[id] = valueForForm(field);
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
  }

  function renderHelp(field: UiField) {
    const help = helpFor(field, language);
    return (
      <div className="field-help">
        {help ? <small>{help}</small> : null}
        {field.example ? <small><strong>{language === "th" ? "ตัวอย่าง:" : "Example:"}</strong> {field.example}</small> : null}
      </div>
    );
  }

  function renderNestedControl(field: UiField, value: unknown, onChange: (next: unknown) => void) {
    const options = field.options || field.choices || field.enum || [];
    if (isImageField(field)) {
      return <ImageUploadControl field={field} value={value} onChange={onChange as (value: string | string[]) => void} />;
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
                <strong>{field.itemLabel || "Item"} {index + 1}</strong>
                <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>
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
            Add {field.itemLabel || "item"}
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
              <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>
            </div>
          ))}
          <button type="button" className="link-button" onClick={() => onChange([...rows, ""])}>Add item</button>
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
      setStatus("Needs input", "warn");
      return;
    }
    const params = samplePayload || fields.reduce<Record<string, unknown>>((payload, field) => {
      const id = fieldId(field);
      if (id) payload[id] = normalizeFormValue(field, values[id]);
      return payload;
    }, {});
    setRunning(true);
    setRuntimeStatus("Starting...");
    setResult(null);
    setStatus("Running", "warn");
    try {
      const next = await runSkillStream({ skillId: selectedSkillId, params, llmConfig: config }, (status) => {
        setRuntimeStatus(status.message || status.phase || "Running");
      });
      setResult(next);
      setStatus("Completed", "ok");
      onRunComplete();
    } catch (error) {
      setRuntimeStatus(error instanceof Error ? error.message : "Skill run failed.");
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
          <p>{schema?.skill.description || "Schema-driven skill runtime."}</p>
        </div>
        <button type="button" className="primary" disabled={running || !selectedSkillId} onClick={() => void runSkill()}>
          {running ? "Running..." : t(language, "run")}
        </button>
      </div>

      <label className="skill-select">
        <span>Skill</span>
        <select value={selectedSkillId} onChange={(event) => onSkillChange(event.target.value)} aria-label="Skill">
          {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.title}</option>)}
          {invalidSkills.map((skill) => <option key={skill.id} value={skill.id} disabled>{skill.title} (invalid)</option>)}
        </select>
      </label>

      {schemaError ? <p className="alert">{schemaError}</p> : null}
      {schema?.skill && !schema.skill.hasRuntime && !hasConfiguredLlm(config) ? (
        <p className="warning">This skill has no local runtime. Configure an LLM key and fallback model to run it.</p>
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
            <button type="submit" className="primary" disabled={running || !selectedSkillId}>{running ? "Running..." : t(language, "run")}</button>
            <button type="button" onClick={resetForm}>{t(language, "reset")}</button>
            {selectedSkillId === "gpt-image-prompt-engineer" ? (
              <button type="button" onClick={thaiCatsSample}>{t(language, "sample")}</button>
            ) : null}
          </div>
          {runtimeStatus ? <p className="runtime-status">{runtimeStatus}</p> : null}
        </form>
        <OutputTabs language={language} result={result} placeholder="Choose a skill, fill required fields, then run." />
      </div>
    </section>
  );
}
