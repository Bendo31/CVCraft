import { useLayoutEffect, useMemo, useRef, useState } from 'react'

export const RESUME_SHEET_WIDTH = 650
export const RESUME_SHEET_HEIGHT = Math.round(RESUME_SHEET_WIDTH / (210 / 297))
const FOOTER_RESERVE = 110
const PAGE_GAP = 28
const BLOCK_GAP = 14

function formatPageLabel(pageIndex, totalPages) {
  return `${String(pageIndex + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`
}

function mergeColumnPages(leftPages, rightPages) {
  const total = Math.max(leftPages.length, rightPages.length, 1)
  const carriedLeft = leftPages[0] || []
  return Array.from({ length: total }, (_, index) => {
    const left = leftPages[index] || []
    const right = rightPages[index] || []
    // Sur les pages suivantes, reporter la colonne gauche si elle est vide
    // (le contenu de droite a débordé mais la gauche tenait encore sur la page 1).
    const resolvedLeft = left.length > 0 ? left : (index > 0 ? carriedLeft : [])
    return { left: resolvedLeft, right }
  })
}

function ResumeHeader({ resume, photo, template, continued }) {
  if (continued) {
    return (
      <div className="resume-sheet-top resume-sheet-top-continued" data-measure="header-continued">
        <div className="resume-identity">
          <div>
            <h2>
              {resume.firstName}{' '}
              <strong>{resume.lastName}.</strong>
            </h2>
            <span>{resume.role.toUpperCase()}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="resume-sheet-top" data-measure="header-full">
      <div className="resume-identity">
        {photo && <img className="resume-photo" src={photo} alt="Portrait" />}
        <div>
          <h2>
            {resume.firstName}
            {template === 'signal' ? ' ' : <br />}
            <strong>{resume.lastName}.</strong>
          </h2>
          <span>{resume.role.toUpperCase()}</span>
        </div>
      </div>
      <div className="resume-contact">
        <span>{resume.email}</span>
        <span>{resume.phone}</span>
        <span>{resume.city}</span>
        {resume.linkedin && <span>{resume.linkedin}</span>}
      </div>
    </div>
  )
}

function LeftBlock({ item, resume }) {
  if (item.type === 'summary') {
    return (
      <div className="resume-block" data-block-id="summary">
        <span className="resume-label">Profil</span>
        <p>{resume.summary}</p>
      </div>
    )
  }

  if (item.type === 'contact') {
    return (
      <div className="resume-block" data-block-id="contact">
        <span className="resume-label">Contact</span>
        <p>
          {resume.email}<br />
          {resume.phone}<br />
          {resume.city}<br />
          {resume.linkedin}
        </p>
      </div>
    )
  }

  if (item.type === 'skills') {
    return (
      <div className="resume-block" data-block-id="skills">
        <span className="resume-label">Compétences</span>
        <p>
          {resume.skills.filter(Boolean).map((skill, index) => (
            <span className="resume-skill" key={`${skill}-${index}`}>
              <i aria-hidden="true">{['✦', '◌', '↗', '◇'][index % 4]}</i>
              {skill}
            </span>
          ))}
        </p>
      </div>
    )
  }

  if (item.type === 'certs') {
    return (
      <div className="resume-block" data-block-id="certs">
        <span className="resume-label">Certifications</span>
        {resume.certifications.map((certification, index) => (
          <div className="resume-entry resume-certification" key={`cert-${index}`}>
            <strong>{certification.name}</strong>
            <p>
              <span>{certification.issuer}</span>
              <b>{certification.year}</b>
            </p>
          </div>
        ))}
      </div>
    )
  }

  if (item.type === 'refs') {
    return (
      <div className="resume-block" data-block-id="refs">
        <span className="resume-label">Références</span>
        {resume.references.map((reference, index) => (
          <p className="resume-reference" key={`ref-${index}`}>
            <strong>{reference.name}</strong><br />
            {reference.role}<br />
            {reference.contact}
          </p>
        ))}
      </div>
    )
  }

  return null
}

function RightBlock({ item, resume, formatDateRange, showLabel = true }) {
  if (item.type === 'exp') {
    const experience = resume.experiences[item.index]
    if (!experience) return null
    return (
      <div className={`resume-entry-wrap${showLabel ? ' resume-entry-wrap-labeled' : ''}`} data-block-id={item.id}>
        {showLabel && <span className="resume-label">Expérience</span>}
        <div className="resume-entry">
          <strong>{experience.company}</strong>
          <p>
            <span>{experience.jobTitle}</span>
            <b>{formatDateRange(experience.startDate, experience.endDate)}</b>
          </p>
          {experience.tasks && (
            <div className="resume-tasks">
              {experience.tasks.split(/\r?\n/).filter(Boolean).map((task, taskIndex) => (
                <div className="resume-task-line" key={`task-${item.index}-${taskIndex}`}>{task}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (item.type === 'edu') {
    const education = resume.educations[item.index]
    if (!education) return null
    return (
      <div className={`resume-entry-wrap${showLabel ? ' resume-entry-wrap-labeled' : ''}`} data-block-id={item.id}>
        {showLabel && <span className="resume-label">Formation académique</span>}
        <div className="resume-entry">
          <strong>{education.school}</strong>
          <p>
            <span>{education.degree}</span>
            <b>{formatDateRange(education.startDate, education.endDate)}</b>
          </p>
        </div>
      </div>
    )
  }

  return null
}

function renderLeftColumn(items, resume) {
  return items.map((item) => <LeftBlock key={item.id} item={item} resume={resume} />)
}

function renderRightColumn(items, resume, formatDateRange) {
  let lastSection = null
  return items.map((item) => {
    const section = item.type
    const showLabel = lastSection !== section
    lastSection = section
    return (
      <RightBlock
        key={item.id}
        item={item}
        resume={resume}
        formatDateRange={formatDateRange}
        showLabel={showLabel}
      />
    )
  })
}

function ResumeSheet({
  resume,
  photo,
  template,
  page,
  pageIndex,
  totalPages,
  formatDateRange,
  measure = false,
  style,
}) {
  const continued = pageIndex > 0
  const sheetStyle = measure
    ? {
        width: RESUME_SHEET_WIDTH,
        height: 'auto',
        minHeight: 0,
        aspectRatio: 'auto',
        ...style,
      }
    : style

  return (
    <div
      className={`resume-sheet resume-template-${template}${continued ? ' resume-sheet-continued' : ''}${measure ? ' resume-sheet-measure' : ''}`}
      style={sheetStyle}
      data-page={pageIndex + 1}
    >
      <ResumeHeader resume={resume} photo={photo} template={template} continued={continued} />
      {!continued && <div className="resume-rule" data-measure="rule" />}
      <div className="resume-content" data-measure="content">
        <div className="resume-left">
          {measure
            ? page.left.map((item) => <LeftBlock key={item.id} item={item} resume={resume} />)
            : renderLeftColumn(page.left, resume)}
        </div>
        <div className="resume-right">
          {measure ? (
            <>
              <span className="resume-label" data-measure="exp-label">Expérience</span>
              <span className="resume-label" data-measure="edu-label">Formation académique</span>
              {page.right.map((item) => (
                <RightBlock key={item.id} item={item} resume={resume} formatDateRange={formatDateRange} showLabel={false} />
              ))}
            </>
          ) : (
            renderRightColumn(page.right, resume, formatDateRange)
          )}
        </div>
      </div>
      <div className="resume-sheet-footer">
        <span>Made With Love By CVcraft</span>
        <span>{formatPageLabel(pageIndex, totalPages)}</span>
      </div>
    </div>
  )
}

/** Place chaque bloc en entier : s'il croise la zone footer, il part sur la page suivante. */
function packAtomicBlocks(items, heights, labelHeights, capacities) {
  const pages = []
  let current = []
  let used = 0
  let pageIndex = 0
  let openSection = null

  const capacityFor = (index) => capacities[Math.min(index, capacities.length - 1)]

  const pushPage = () => {
    if (!current.length) return
    pages.push(current)
    current = []
    used = 0
    openSection = null
    pageIndex += 1
  }

  items.forEach((item) => {
    const needsLabel = Boolean(labelHeights[item.type]) && openSection !== item.type
    const labelHeight = needsLabel ? (labelHeights[item.type] || 0) : 0
    const blockHeight = (heights[item.id] || 0) + labelHeight

    // Bloc atomique : s'il ne tient pas sous le footer avec le contenu courant → page suivante.
    if (current.length > 0 && used + blockHeight > capacityFor(pageIndex)) {
      pushPage()
    }

    const needsLabelNow = Boolean(labelHeights[item.type]) && openSection !== item.type
    const labelNow = needsLabelNow ? (labelHeights[item.type] || 0) : 0
    if (needsLabelNow) openSection = item.type

    current.push(item)
    used += (heights[item.id] || 0) + labelNow
  })

  pushPage()
  if (!pages.length) pages.push([])
  return pages
}

export function ResumeDocument({
  resume,
  photo,
  template,
  baseColor,
  selectedFont,
  formatDateRange,
}) {
  const measureRef = useRef(null)
  const wrapRef = useRef(null)
  const [pages, setPages] = useState([{ left: [], right: [] }])
  const [scale, setScale] = useState(1)

  const leftItems = useMemo(() => {
    const items = [{ id: 'summary', type: 'summary' }]
    if (template === 'sillage') items.push({ id: 'contact', type: 'contact' })
    items.push({ id: 'skills', type: 'skills' })
    if (resume.certifications.length > 0) items.push({ id: 'certs', type: 'certs' })
    if (resume.references.length > 0) items.push({ id: 'refs', type: 'refs' })
    return items
  }, [resume.certifications.length, resume.references.length, template])

  const rightItems = useMemo(() => {
    const items = []
    resume.experiences.forEach((_, index) => {
      items.push({ id: `exp-${index}`, type: 'exp', index })
    })
    resume.educations.forEach((_, index) => {
      items.push({ id: `edu-${index}`, type: 'edu', index })
    })
    return items
  }, [resume.educations, resume.experiences])

  const allPage = useMemo(() => ({ left: leftItems, right: rightItems }), [leftItems, rightItems])

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined
    const updateScale = () => {
      const nextScale = Math.min(1, wrap.clientWidth / RESUME_SHEET_WIDTH)
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1)
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  const fixPassRef = useRef(0)

  useLayoutEffect(() => {
    const root = measureRef.current
    if (!root) return undefined

    const frame = window.requestAnimationFrame(() => {
      const heights = {}
      root.querySelectorAll('[data-block-id]').forEach((node) => {
        const id = node.getAttribute('data-block-id')
        if (!id) return
        heights[id] = node.getBoundingClientRect().height + BLOCK_GAP
      })

      const expLabel = root.querySelector('[data-measure="exp-label"]')
      const eduLabel = root.querySelector('[data-measure="edu-label"]')
      const labelHeights = {
        exp: expLabel ? expLabel.getBoundingClientRect().height + 10 : 26,
        edu: eduLabel ? eduLabel.getBoundingClientRect().height + 10 : 26,
      }

      const fullHeader = root.querySelector('[data-measure="header-full"]')
      const continuedHeader = root.querySelector('[data-measure="header-continued"]')
      const rule = root.querySelector('[data-measure="rule"]')
      const fullHeaderHeight = (fullHeader?.getBoundingClientRect().height || 0)
        + (rule?.getBoundingClientRect().height || 0)
        + 24
      const continuedHeaderHeight = (continuedHeader?.getBoundingClientRect().height || 64) + 20

      const page1Capacity = Math.max(120, RESUME_SHEET_HEIGHT - fullHeaderHeight - FOOTER_RESERVE)
      const nextCapacity = Math.max(180, RESUME_SHEET_HEIGHT - continuedHeaderHeight - FOOTER_RESERVE)
      const capacities = [page1Capacity, nextCapacity]

      fixPassRef.current = 0
      const leftPages = packAtomicBlocks(leftItems, heights, {}, capacities)
      const rightPages = packAtomicBlocks(rightItems, heights, labelHeights, capacities)
      setPages(mergeColumnPages(leftPages, rightPages))
    })

    return () => window.cancelAnimationFrame(frame)
  }, [allPage, baseColor, leftItems, photo, resume, rightItems, selectedFont, template])

  // Contrôle final : si un bloc traverse encore le footer, basculer tout le bloc page suivante.
  useLayoutEffect(() => {
    if (fixPassRef.current > 6) return undefined
    const sheets = document.querySelectorAll('#resume-preview .resume-sheet')
    if (!sheets.length) return undefined

    const frame = window.requestAnimationFrame(() => {
      const forcedBreaks = { left: new Set(), right: new Set() }

      sheets.forEach((sheet) => {
        const footer = sheet.querySelector('.resume-sheet-footer')
        if (!footer) return
        const footerTop = footer.getBoundingClientRect().top

        sheet.querySelectorAll('[data-block-id]').forEach((node) => {
          const rect = node.getBoundingClientRect()
          if (rect.bottom <= footerTop + 0.5) return
          const id = node.getAttribute('data-block-id')
          if (!id) return
          if (id.startsWith('exp-') || id.startsWith('edu-')) forcedBreaks.right.add(id)
          else forcedBreaks.left.add(id)
        })
      })

      if (!forcedBreaks.left.size && !forcedBreaks.right.size) {
        fixPassRef.current = 0
        return
      }

      fixPassRef.current += 1
      setPages((current) => {
        const next = current.map((page) => ({ left: [...page.left], right: [...page.right] }))
        let changed = false

        for (let pageIndex = 0; pageIndex < next.length; pageIndex += 1) {
          ;['left', 'right'].forEach((column) => {
            const breakIds = forcedBreaks[column]
            if (!breakIds.size) return
            const list = next[pageIndex][column]
            const cutIndex = list.findIndex((item) => breakIds.has(item.id))
            if (cutIndex < 0) return
            const moving = list.splice(cutIndex)
            if (!moving.length) return
            changed = true
            if (!next[pageIndex + 1]) next.push({ left: [], right: [] })
            const existingIds = new Set(next[pageIndex + 1][column].map((item) => item.id))
            const uniqueMoving = moving.filter((item) => !existingIds.has(item.id))
            next[pageIndex + 1][column] = [...uniqueMoving, ...next[pageIndex + 1][column]]
          })
        }

        if (!changed) return current
        return mergeColumnPages(
          next.map((page) => page.left),
          next.map((page) => page.right),
        )
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pages, resume, template, baseColor, selectedFont, photo])

  const sheetStyleVars = {
    '--signal-color': baseColor,
    '--cv-accent': baseColor,
    '--cv-font': selectedFont.family,
    '--cv-font-display': selectedFont.display,
  }
  const stackHeight = pages.length * RESUME_SHEET_HEIGHT + Math.max(0, pages.length - 1) * PAGE_GAP

  return (
    <>
      <div className="resume-measure-root" aria-hidden="true" ref={measureRef}>
        <ResumeSheet
          resume={resume}
          photo={photo}
          template={template}
          page={allPage}
          pageIndex={0}
          totalPages={1}
          formatDateRange={formatDateRange}
          measure
          style={sheetStyleVars}
        />
        <div className={`resume-sheet resume-template-${template} resume-sheet-continued resume-sheet-measure`} style={{ ...sheetStyleVars, width: RESUME_SHEET_WIDTH }}>
          <ResumeHeader resume={resume} photo={photo} template={template} continued />
        </div>
      </div>

      <div className="resume-pages-wrap" ref={wrapRef} style={{ height: stackHeight * scale }}>
        <div
          className="resume-pages"
          id="resume-preview"
          style={{
            ...sheetStyleVars,
            transform: `scale(${scale})`,
            width: RESUME_SHEET_WIDTH,
          }}
        >
          {pages.map((page, pageIndex) => (
            <ResumeSheet
              key={`page-${pageIndex}-${page.left.map((item) => item.id).join('.')}-${page.right.map((item) => item.id).join('.')}`}
              resume={resume}
              photo={photo}
              template={template}
              page={page}
              pageIndex={pageIndex}
              totalPages={pages.length}
              formatDateRange={formatDateRange}
              style={{
                ...sheetStyleVars,
                width: RESUME_SHEET_WIDTH,
                height: RESUME_SHEET_HEIGHT,
                aspectRatio: 'auto',
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
