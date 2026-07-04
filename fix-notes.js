const fs = require('fs');
const path = 'src/app/dashboard/notes/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `        // 3. Decrypt
        if (note.encrypted_title && note.title_iv) {
          const decTitle = await decryptTextWithAES(key, note.title_iv, note.encrypted_title);
          setTitle(decTitle);
        } else {
          setTitle("Untitled Note");
        }

        if (note.encrypted_content && note.content_iv) {
          const decContent = await decryptTextWithAES(key, note.content_iv, note.encrypted_content);
          setContent(decContent);
        } else {
          setContent("");
        }`;

const replace1 = `        // 3. Decrypt
        if (note.encrypted_title) {
          const decTitle = await decryptTextWithAES(key, note.encrypted_title);
          setTitle(decTitle);
        } else {
          setTitle("Untitled Note");
        }

        if (note.encrypted_content) {
          const decContent = await decryptTextWithAES(key, note.encrypted_content);
          setContent(decContent);
        } else {
          setContent("");
        }`;

content = content.replace(target1, replace1);

const target2 = `      // 2. Send PATCH to /api/notes/[id]
      const payload = {
        encrypted_title: encTitle.ciphertext,
        title_iv: encTitle.iv,
        encrypted_content: encContent.ciphertext,
        content_iv: encContent.iv
      };`;

const replace2 = `      // 2. Send PATCH to /api/notes/[id]
      const payload = {
        encrypted_title: encTitle,
        encrypted_content: encContent
      };`;

content = content.replace(target2, replace2);
fs.writeFileSync(path, content, 'utf8');
console.log('Done');
