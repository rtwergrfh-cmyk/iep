# IEP Glance: summary for district technology and privacy teams

**What it is:** A free, open-source web page that helps special education teachers turn an IEP or Section 504 plan into one-page summaries ("IEP at a glance" sheets) for the general education teachers, paraprofessionals and substitutes who work with the student.

**Who uses it:** Special education teachers and case managers, who already have access to the IEP and are responsible for informing the team under 34 CFR 300.323(d).

## How data is handled

| Question | Answer |
| --- | --- |
| Is the IEP uploaded anywhere? | No. The PDF is read inside the browser tab using pdf.js, which is bundled into the page. |
| Does the page make network requests? | Only the request that loads the page. Its Content Security Policy sets `connect-src 'none'`, `default-src 'none'` and `form-action 'none'`, so the browser blocks any outgoing data. This can be verified in the browser's developer tools (Network tab). |
| Does it work offline? | Yes. It can be downloaded as one HTML file and run with no internet connection. |
| Is anything stored? | No. Nothing is written to cookies, localStorage or IndexedDB. Closing the tab, or choosing "Start over", discards everything. |
| Is AI used? | No AI service is used and nothing is sent to one. Sorting uses rules plus a small statistical model (logistic regression, about 260 KB) that is part of the page and runs in the browser. It was trained only on fictional, IEP-style text. It isn't a chatbot or generative AI: it labels lines that are already in the IEP and never writes new text. |
| Is a translation service used for Spanish sheets? | No. Spanish sheet wording and about 150 common accommodation phrases are built into the page. Anything else is translated by the teacher or an interpreter. |
| Are there accounts or analytics? | No. |
| What does the output contain? | Initials or a code chosen by the teacher, grade, IEP end date, and the accommodations, behavior plan, goals, services and health information the teacher selects. The student's name, birth date, IDs, parent names and contact details are found from the IEP's labels and removed before review. Other people's names (classmates, siblings, staff) are detected from context and listed for the teacher to confirm, but this detection is not complete: the teacher checks the list and the final sheets, and can add any name that was missed. Diagnosis labels start switched off. |
| Can the code be inspected? | Yes. The full source is public and readable, and the page itself is a single unminified application file plus the bundled pdf.js library. |

## What the district still controls

- Whether staff may use the tool, and on which devices.
- How printed or copied sheets are shared and stored. They are student records and should be treated like the "IEP at a glance" summaries staff already prepare by hand.
- Hosting. A district can host its own copy on an internal site, or distribute the offline file, so that it never depends on an outside website.

If the district requires a data privacy agreement for every tool on its approved list, the developer can sign the Student Data Privacy Consortium's National Data Privacy Agreement. Its obligations are straightforward to meet when the provider receives no data.

**Contact:** rtwergrfh@gmail.com
