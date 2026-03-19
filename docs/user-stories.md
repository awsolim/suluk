# Suluk User Stories

Stories are referenced by Playwright test files using ID comments (e.g., `// Covers: S-1, S-8, R-5`).

---

## Student

| ID | Story | Related Issues |
|----|-------|---------------|
| S-1 | As a student, I can browse programs without logging in | #7 |
| S-2 | As a student, I can sign up and get redirected to my dashboard | #7 |
| S-3 | As a student, I can apply to a program | #8 |
| S-4 | As a student, I can see my application status in my dashboard | #8 |
| S-5 | As a student, I can confirm enrollment after being accepted | #8 |
| S-6 | As a student, I can pay for a paid program after acceptance | #8, #13 |
| S-7 | As a student, I can view my enrolled classes and schedule | — |
| S-8 | As a student, I can navigate between programs and login/signup pages | #7 |
| S-9 | As a student, I can leave/unenroll from a program | New |
| S-10 | As a student, I can edit my profile (name, phone, age) | — |
| S-11 | As a student, I can see announcements in my enrolled classes | — |

## Teacher

| ID | Story | Related Issues |
|----|-------|---------------|
| T-1 | As a teacher, I see pending applications at the top of my dashboard | #14 |
| T-2 | As a teacher, I can accept or reject applications | #8 |
| T-3 | As a teacher, I can click a student and see their info (not redirect) | #9 |
| T-4 | As a teacher, I can remove a student from a program | #10 |
| T-5 | As a teacher, I can view my assigned classes and post announcements | — |
| T-6 | As a teacher, I can create programs (if admin allows) | New |
| T-7 | As a teacher, I can change program pricing (if admin allows) | New |
| T-8 | As a teacher, I can edit/delete my own announcements | New |

## Admin

| ID | Story | Related Issues |
|----|-------|---------------|
| A-1 | As an admin, I can create a new program | — |
| A-2 | As an admin, I can set a program as free or paid with monthly pricing | #13 |
| A-3 | As an admin, I can edit an existing program's pricing | #13 |
| A-4 | As an admin, I can remove a student from any program | New |
| A-5 | As an admin, I can unassign a teacher from a program | New |
| A-6 | As an admin, I can delete a program | New |
| A-7 | As an admin, I can remove a member from the mosque | New |
| A-8 | As an admin, I can toggle a teacher's can_manage_programs permission | New |
| A-9 | As an admin, I can assign a teacher to a program | New |
| A-10 | As an admin, I can change a member's role | New |
| A-11 | As an admin, I can view all mosque members with their roles | New |

## Responsive / Cross-cutting

| ID | Story | Related Issues |
|----|-------|---------------|
| R-1 | All pages render correctly on mobile (375px) | #2 |
| R-2 | All pages render correctly on tablet (768px) | #2 |
| R-3 | All pages render correctly on desktop (1280px) | #2 |
| R-4 | Desktop shows sidebar navigation, mobile shows bottom nav | #2 |
| R-5 | Programs page does not crash with incomplete data | #5 |
