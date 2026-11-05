# Dây chuyền dựng đề Reading (Night IELTS)

1. **Lấy chữ** (code): OCR các trang đề + trang đáp án của sách (PDF scan) → file .txt + ảnh trang.
2. **Dựng đề** (AI, Sonnet): đọc OCR + ảnh, viết `spec.json` theo mẫu dưới.
3. **Kiểm định** (code): `node tools/reading-pipeline/build.js spec.json` → báo lỗi; AI sửa spec rồi chạy lại.
4. **Xuất bản** (code): `node tools/reading-pipeline/build.js spec.json --write` → `reading/cam<book>/test<n>.html` + `reading/manifest.json`, rồi git push.

## Mẫu spec.json

```json
{
  "meta": { "source": "cambridge", "book": "18", "testNum": "1" },
  "key": ["lettuces", "1,000 kg", "..."],                 // 40 đáp án CHÉP TỪ TRANG ĐÁP ÁN CỦA SÁCH, đúng thứ tự 1–40
  "passages": [
    {
      "title": "Urban farming",
      "intro": "In Paris, urban farmers are trying ... (câu dẫn in nghiêng dưới tiêu đề, KHÔNG phải đoạn; bỏ nếu không có)",
      "paragraphs": [
        { "letter": null, "text": "On top of a striking new exhibition hall ..." },
        { "letter": "A", "text": "..." },                 // đoạn có chữ cái A, B, C... trong sách thì ghi letter (KHÔNG chép chữ cái vào text)
        { "letter": null, "text": "..." }                 // đoạn tiếp theo cùng section (sách không in chữ cái) → letter null
      ],
      "groups": [ /* xem các dạng bên dưới, đúng thứ tự trong sách */ ]
    }
  ]
}
```

Quy tắc chung cho mọi câu: `{ "text": "...", "answer": "...", "exp": "...", "loc": "..." }`
- `answer`: đúng như sách. Nhiều đáp án chấp nhận → `"flavour / flavor"`; phần không bắt buộc để trong ngoặc `"(food) consumption"`.
- `exp`: giải thích TIẾNG VIỆT 1–3 câu, trích câu tiếng Anh trong bài làm bằng chứng, nói rõ vì sao chọn (với TFNG/NG nói vì sao không phải 2 đáp án kia).
- `loc`: cụm bằng chứng CHÉP NGUYÊN VĂN từ 1 đoạn của bài (8–25 từ, nằm gọn trong 1 đoạn, giữ đúng dấu câu). NOT GIVEN có thể để "".
- Trong `text` của đoạn văn KHÔNG dùng ngoặc kép thẳng `"` — dùng `‘ ’` hoặc `“ ”` như sách.
- `instruction`: chép hướng dẫn của sách, mỗi dòng cách nhau bằng `\n` (vd "Complete the sentences below.\nChoose ONE WORD ONLY from the passage for each answer.").

### Các dạng nhóm câu (`type`)
| Dạng | Trường riêng | Ghi chú |
|---|---|---|
| `tfng` | `labels`: `["TRUE","FALSE","NOT GIVEN"]` hoặc `["YES","NO","NOT GIVEN"]` | answer = 1 nhãn |
| `text` | `notesTemplate` (tuỳ chọn) | Có khung ghi chú/tóm tắt → `notesTemplate` với `_____` cho mỗi chỗ trống, `text` của câu để "". Câu hoàn thành câu riêng lẻ → không có notesTemplate, `text` chứa `_____` |
| `table` | `tableColumns: [..]`, `tableRowsRaw: "ô | ô | ô\n..."` | mỗi chỗ trống `_____`, `text` để "" |
| `wordbank` | `notesTemplate`, `matchOptions: ["text A", "text B", ...]` | answer = chữ cái A, B... |
| `mcq` | mỗi câu có `options: ["...", "...", "...", "..."]` (không ghi "A.") | answer A–D |
| `multi` | `matchOptions` | mỗi câu answer 1 chữ cái, `text` "" |
| `heading` | `matchOptions: ["heading i", "heading ii", ...]` (không ghi số La Mã) | `text` = "Paragraph B" / "Section C"; answer = i, ii, iii... |
| `grid` | `matchOptions: ["","",...]` 1 phần tử rỗng cho mỗi chữ cái A–? | "Which paragraph contains…", answer = chữ cái |
| `list_match` | `matchOptions: ["Carolin Frueh", ...]` (không ghi "A") | answer = chữ cái |
| `inline` | mỗi câu `pre`, `post` thay cho `text` | |
