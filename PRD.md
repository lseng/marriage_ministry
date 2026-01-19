# Marriage Ministry Application
## Product Requirements Document (PRD)

**Version:** 1.0
**Last Updated:** January 2026
**Status:** In Development

---

## Executive Summary

The Marriage Ministry Application is a digital platform that helps Resonate Church manage its pre-marital and marriage enrichment programs. It replaces manual spreadsheet tracking and PDF-based homework with a modern, easy-to-use system that connects church staff, volunteer coaches, and participating couples.

**The Problem We're Solving:**
- Tracking couple progress across spreadsheets is time-consuming and error-prone
- Coaches have no central place to see their assigned couples or pending reviews
- Couples receive homework via PDF and email, making submissions inconsistent
- Ministry leaders lack visibility into program health and engagement

**The Solution:**
A single application where everyone can see what they need, do what they need, and stay connected—whether on a computer or phone.

---

## Who Uses This Application?

### 1. Ministry Managers (Admins)
Church staff who oversee the entire marriage ministry program.

**What they need to do:**
- See overall program health at a glance (how many couples, completion rates, etc.)
- Add and manage coaches
- Add and manage couples
- Create weekly assignments
- Send assignments to all couples or specific groups
- View all homework submissions
- Create custom homework forms

### 2. Coaches (Mentor Couples)
Trained volunteer couples who guide participating couples through the program.

**What they need to do:**
- See which couples are assigned to them
- View their couples' progress
- Review and respond to homework submissions
- Get notified when a couple submits homework
- Track which couples may need extra attention

### 3. Couples (Participants)
Engaged or married couples participating in the program.

**What they need to do:**
- See their current and upcoming assignments
- Complete homework digitally (no more printing PDFs!)
- Track their own progress through the program
- **NEW: Complete assignments via text message** (for those who don't want to log in)
- **NEW: Have a guided conversation** that walks them through reflection questions

---

## Core Features

### Already Built ✓

#### User Accounts & Security
- Email and password login
- "Magic link" login option (click a link in email to sign in)
- Each user type (manager, coach, couple) only sees what's relevant to them
- Secure data—couples can't see other couples' information

#### Manager Dashboard
- Overview cards showing key numbers:
  - Total coaches and couples
  - Assignments completed this week
  - Items needing attention
- Recent activity feed
- Quick action buttons to add coaches, couples, or assignments

#### Coach Dashboard
- List of assigned couples with status
- Pending homework reviews
- Activity from their couples

#### Couple Dashboard
- Current assignment with due date
- Progress through the program
- Quick access to complete homework

#### Coach Management
- Add, edit, and deactivate coaches
- View coach profiles with their assigned couples
- Search and filter the coach list

#### Couple Management
- Add, edit, and update couple status
- Assign coaches to couples
- View detailed couple profiles with homework history
- Track couple stage: pre-marital, newlywed, enrichment

#### Assignment System
- Create weekly assignments with:
  - Title and description
  - Detailed content (instructions, reflection questions)
  - Due date
- Distribute assignments to:
  - All active couples
  - All couples of a specific coach
  - Hand-picked individual couples
- Track who has completed, who is pending, who is overdue

#### Homework Submission
- Couples complete homework digitally in the app
- Save drafts and come back later
- Coaches review submissions and leave notes
- Dynamic forms (not just text boxes—can include multiple choice, scales, etc.)

#### In-App Notifications
- Bell icon shows new notifications
- Couples notified of new assignments
- Coaches notified when couples submit homework

---

### Coming Soon (Planned Features)

#### 1. Email Invitations for New Users
**What it does:** Instead of creating passwords for people, managers can send an email invitation. The person clicks a link, sets their own password, and they're in.

**Why it matters:**
- More secure (no sharing temporary passwords)
- Better experience for new users
- Coaches and couples feel welcomed, not just "added to a system"

#### 2. Email Notifications
**What it does:** Important updates sent directly to email, not just in-app.

**Examples:**
- "You have a new assignment: Communication Basics"
- "Reminder: Your assignment is due in 2 days"
- "The Smiths submitted their homework—ready for review"
- Weekly digest for coaches showing their couples' progress

**Why it matters:** People don't have to remember to check the app—important info comes to them.

#### 3. Text Message (SMS) Support for Couples
**What it does:** Couples can complete assignments by texting a phone number instead of logging into the app.

**How it works:**
1. Couple verifies their phone number in the app (one-time setup)
2. When a new assignment is published, they get a text
3. They can text back their response, and it's saved as their homework
4. Commands like "STATUS" show their current assignment, "HELP" shows options

**Example conversation:**
```
App: New assignment: "Communication Basics". Due Jan 25.
     Reply with your response or text HELP for options.

Couple: We practiced active listening this week by putting
        away our phones during dinner conversations...

App: Got it! Your response has been submitted. Your coach
     will review it soon.
```

**Why it matters:**
- Meets couples where they are (everyone texts)
- Removes friction—no app login required
- Higher completion rates expected

#### 4. AI-Guided Conversations
**What it does:** Instead of filling out a form, couples can have a natural conversation with an AI assistant that guides them through the assignment questions.

**How it works:**
1. Couple starts a chat (in the app or via text)
2. The AI asks thoughtful questions based on the assignment
3. Couple responds naturally, like talking to a friend
4. AI extracts their answers and saves them as homework
5. Works just like a journaling conversation

**Example conversation:**
```
AI: Hi! Let's talk about this week's topic: active listening.
    Can you share a recent conversation where you felt
    really heard by your spouse?

Couple: Last Tuesday we talked about work stress and my
        husband actually put his phone down and made
        eye contact the whole time.

AI: That's wonderful! It sounds like being fully present
    made a difference. What did that feel like for you?

Couple: It felt like he actually cared about what I was
        going through, not just waiting for his turn to talk.

AI: That's a beautiful insight. Now, thinking about your
    own listening habits—is there something you'd like
    to improve?

[...conversation continues...]

AI: Thank you for sharing so openly! I've captured your
    reflections. Would you like me to submit this as your
    homework response?

Couple: Yes!

AI: Done! Your coach will review it soon. Great conversation!
```

**Why it matters:**
- More personal than filling out a form
- Encourages deeper reflection
- Feels like journaling together, not homework
- Some couples will engage more this way

#### 5. Notification Preferences
**What it does:** Each user can choose how they want to be notified.

**Options:**
- Email notifications: on/off for different types
- Text notifications: on/off (couples only)
- Quiet hours: "Don't notify me between 10pm and 7am"
- Weekly digest: choose which day to receive summary

**Why it matters:** People aren't overwhelmed with notifications they don't want.

---

## Design & Branding

The application follows the official Resonate brand guidelines:

- **Colors:**
  - Primary Blue (#41748d) - buttons, links, headers
  - Secondary Green (#50a684) - success states, confirmations
  - Dark Gray (#373a36) - body text

- **Logo:** Diamond shape representing the multi-faceted nature of the gospel

- **Tone:** Warm, encouraging, gospel-centered
  - Instead of "Assignment overdue" → "Ready when you are"
  - Instead of "Complete your homework" → "Continue your journey"

- **Design Reference:** [Figma Designs](https://www.figma.com/design/OYkmQvam43rQbp3uizyhai/Marriage-Ministry)

---

## User Journeys

### Journey 1: A Couple Joins the Program

1. **Manager** adds couple to the system with their email
2. **Couple** receives welcome email with login link
3. **Couple** sets their password and logs in
4. **Couple** sees their dashboard with their assigned coach's info
5. **Couple** optionally adds phone number for text notifications

### Journey 2: Weekly Assignment Flow

1. **Manager** creates new assignment "Week 3: Conflict Resolution"
2. **Manager** clicks "Distribute" → selects "All active couples"
3. **Couples** receive notification (email + optional text)
4. **Couple A** logs in and completes homework in the app
5. **Couple B** texts their response from their phone
6. **Couple C** has a guided conversation with the AI
7. **Coach** sees 3 new submissions, reviews each, leaves encouragement
8. **Couples** receive notification that their homework was reviewed

### Journey 3: Coach Reviews Progress

1. **Coach** logs in and sees dashboard
2. Dashboard shows "3 pending reviews" and "1 couple overdue"
3. **Coach** clicks on pending reviews, reads submissions
4. **Coach** leaves encouraging notes for each couple
5. **Coach** sees the overdue couple, decides to reach out personally
6. **Coach** clicks on couple profile, sees their full history

---

## Success Metrics

How we'll know if the application is working:

| Metric | Target | How We Measure |
|--------|--------|----------------|
| Homework completion rate | 80%+ | Completed ÷ Assigned |
| Average time to complete | < 3 days | Assignment date to submission date |
| Coach review turnaround | < 48 hours | Submission to review |
| SMS adoption | 30%+ of couples | Couples with verified phone |
| AI conversation usage | 20%+ of submissions | Submissions via chat |
| Couple retention | 90%+ | Couples completing full program |

---

## Technical Requirements (High Level)

For the technical team's reference:

- **Platform:** Web application (works on phone browsers too)
- **Backend:** Supabase (database, authentication, real-time updates)
- **SMS Provider:** Twilio
- **Email Provider:** Resend
- **AI Provider:** Anthropic (Claude)
- **Hosting:** Vercel (frontend), Supabase (backend)

---

## What's Built vs. What's Remaining

### ✅ Complete (Ready to Use)
- User login and role-based access
- Manager, Coach, and Couple dashboards
- Coach and couple management
- Assignment creation and distribution
- Homework submission and review
- Basic in-app notifications
- Test data for demonstrations

### 🔄 In Progress
- Email invitation system
- Brand color updates to match Resonate guidelines
- Login page redesign (matching Figma)

### 📋 Planned (Not Started)
- Email notifications (Resend integration)
- SMS text messaging (Twilio integration)
- AI-guided conversations (Claude integration)
- Notification preferences page
- Account security enhancements (lockout, stronger passwords)

---

## Questions for Stakeholders

Please review this document and provide feedback on:

1. **User Roles:** Are there any other user types we're missing? (e.g., should there be a "read-only" observer role?)

2. **Assignment Features:** Is there anything else managers need when creating assignments? (attachments, videos, links to resources?)

3. **SMS Feature:** Is text messaging a priority? Should we launch without it first?

4. **AI Conversations:** How important is the AI-guided conversation feature? Is it a "must have" or "nice to have"?

5. **Notifications:** What notifications are most critical? Are we missing any scenarios?

6. **Branding:** Any feedback on how the Resonate brand should be applied?

7. **Mobile App:** Is a native mobile app needed eventually, or is a mobile-friendly website sufficient?

8. **Reporting:** What reports do ministry leaders need? (e.g., quarterly summaries, coach performance, couple progress exports)

9. **Integration:** Does this need to connect to any other church systems? (ChMS, giving platform, etc.)

10. **Timeline:** What features are essential for the first launch vs. can wait for later phases?

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Coach** | A trained mentor couple who guides participating couples through the program |
| **Couple** | An engaged or married couple participating in the marriage ministry program |
| **Manager/Admin** | Church staff member who oversees the entire marriage ministry |
| **Assignment** | A weekly topic with reflection questions for couples to complete |
| **Homework** | A couple's response to an assignment |
| **Distribution** | The act of sending an assignment to couples |
| **Magic Link** | A login method where you click a link in your email instead of typing a password |
| **RLS (Row Level Security)** | Technical feature ensuring users only see data they're allowed to see |

---

*This document is intended for stakeholder review. Please share feedback with the ministry team so we can ensure the application meets everyone's needs.*
