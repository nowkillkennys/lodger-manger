# 🧪 QA Testing Checklist

## 1. Landlord Authentication
- [ ] Can access login page at /login
- [ ] Can login with admin credentials (admin@example.com / password)
- [ ] Redirects to landlord dashboard after login
- [ ] JWT token stored correctly

## 2. New Tenancy Creation
- [ ] "New Tenancy" button visible on dashboard
- [ ] Step 1: Can enter lodger details
  - [ ] Name, email, phone required
  - [ ] Email validation works
- [ ] Step 2: Can enter room & payment details
  - [ ] Room number/description
  - [ ] Rent amount
  - [ ] Payment frequency shows 28-day cycles
- [ ] Step 3: Can review double payment (current + advance)
  - [ ] First payment shows correct doubled amount
  - [ ] Payment schedule displays correctly
- [ ] Step 4: Agreement generation
  - [ ] Can preview agreement
  - [ ] Can download PDF
  - [ ] PDF contains correct details

## 3. Lodger Access
- [ ] Can login with created lodger credentials
- [ ] Dashboard shows correct:
  - [ ] Room details
  - [ ] Payment schedule
  - [ ] Current balance
  - [ ] Next payment date

## 4. Payment Processing
- [ ] Lodger can:
  - [ ] View payment history
  - [ ] See outstanding balance
  - [ ] Submit new payment
  - [ ] Upload payment proof
- [ ] Landlord can:
  - [ ] See pending payments
  - [ ] Review payment proof
  - [ ] Confirm/reject payments
- [ ] After confirmation:
  - [ ] Balance updates correctly
  - [ ] Payment appears in history
  - [ ] Both parties receive confirmation

## 5. Maintenance Requests
- [ ] Lodger can:
  - [ ] Create new request
  - [ ] Add description
  - [ ] Upload multiple photos
  - [ ] See request status
- [ ] Photos:
  - [ ] Upload works
  - [ ] Preview available
  - [ ] Size limits enforced

## 6. Dashboard Statistics
- [ ] Landlord dashboard shows:
  - [ ] Total active lodgers
  - [ ] Outstanding payments
  - [ ] Recent activity
  - [ ] Maintenance requests
- [ ] All stats update in real-time
- [ ] Numbers match database records

## 7. Error Handling
- [ ] Invalid login shows error
- [ ] Form validations work
- [ ] API errors handled gracefully
- [ ] Upload limits enforced
- [ ] Session expiry handled

## 8. Mobile Responsiveness
- [ ] All pages usable on mobile
- [ ] Forms adjust to screen size
- [ ] Photos upload works on mobile
- [ ] Navigation menu adapts

## Notes:
- Test on multiple browsers
- Check all error states
- Verify email notifications
- Test with different screen sizes