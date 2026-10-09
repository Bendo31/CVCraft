import { useLayoutEffect, useMemo, useRef, useState } from 'react'

export const RESUME_SHEET_WIDTH = 650
export const RESUME_SHEET_HEIGHT = Math.round(RESUME_SHEET_WIDTH / (210 / 297))
const PAGE_GAP = 28

function formatPageLabel(pageIndex, totalPages) {
  return `${String(pageIndex + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`
}

function formatLanguageLevel(level) {
  const numericLevel = Number(level)
  return Number.isInteger(numericLevel) && numericLevel >= 1 && numericLevel <= 5
    ? ` · Niveau ${numericLevel}/5`
    : ''
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

function ResumeHeader({ resume, photo, template, continued, sectionVisibility }) {
  if (continued) {
    return (
      <div className="resume-sheet-top resume-sheet-top-continued" data-measure="header-continued">
        <div className="resume-identity">
          <div>
            {(resume.firstName || resume.lastName) && <h2>
              {resume.firstName}{' '}
              {resume.lastName && <strong>{resume.lastName}.</strong>}
            </h2>}
            {resume.role && <span>{resume.role.toUpperCase()}</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="resume-sheet-top" data-measure="header-full">
      <div className="resume-identity">
        {photo && template !== 'gratuit' && sectionVisibility.personal !== false && <img className="resume-photo" src={photo} alt="Portrait" />}
        <div>
          {(resume.firstName || resume.lastName) && <h2>
            {resume.firstName}
            {resume.lastName && <>{template === 'signal' ? ' ' : <br />}<strong>{resume.lastName}.</strong></>}
          </h2>}
          {resume.role && <span>{resume.role.toUpperCase()}</span>}
        </div>
      </div>
      {sectionVisibility.personal !== false && <div className="resume-contact">
        {resume.email && <span>{resume.email}</span>}
        {resume.phone && <span>{resume.phone}</span>}
        {template !== 'gratuit' && resume.city && <span>{resume.city}</span>}
        {template !== 'gratuit' && resume.linkedin && <span>LinkedIn · {resume.linkedin}</span>}
        {template !== 'gratuit' && resume.facebook && <span>Facebook · {resume.facebook}</span>}
        {template !== 'gratuit' && resume.x && <span>X · {resume.x}</span>}
        {template !== 'gratuit' && resume.threads && <span>Threads · {resume.threads}</span>}
        {template !== 'gratuit' && resume.website && <span>{resume.website}</span>}
      </div>}
    </div>
  )
}

function LeftBlock({ item, resume }) {
  if (item.type === 'summary') {
    return (
      <div className="resume-block" data-block-id="summary">
        <span className="resume-label">Description</span>
        <p>{resume.summary}</p>
      </div>
    )
  }

  if (item.type === 'contact') {
    return (
      <div className="resume-block" data-block-id="contact">
        <span className="resume-label">Contact</span>
        <p>
          {[
            resume.email,
            resume.phone,
            resume.city,
            resume.linkedin && `LinkedIn · ${resume.linkedin}`,
            resume.facebook && `Facebook · ${resume.facebook}`,
            resume.x && `X · ${resume.x}`,
            resume.threads && `Threads · ${resume.threads}`,
            resume.website,
          ].filter(Boolean).map((value, index) => (
            <span key={`${value}-${index}`}>{value}<br /></span>
          ))}
        </p>
      </div>
    )
  }

  if (item.type === 'skills') {
    const skills = Array.isArray(resume.skills) ? resume.skills : []
    return (
      <div className="resume-block" data-block-id="skills">
        <span className="resume-label">Compétences</span>
        <p>
          {skills.filter(Boolean).map((skill, index) => (
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
    const certifications = Array.isArray(resume.certifications) ? resume.certifications : []
    return (
      <div className="resume-block" data-block-id="certs">
        <span className="resume-label">Certifications</span>
        {certifications.map((certification, index) => (
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
    const references = Array.isArray(resume.references) ? resume.references : []
    return (
      <div className="resume-block" data-block-id="refs">
        <span className="resume-label">Références</span>
        {references.map((reference, index) => (
          <p className="resume-reference" key={`ref-${index}`}>
            <strong>{reference.name}</strong><br />
            {reference.role}<br />
            {reference.contact}
          </p>
        ))}
      </div>
    )
  }

  if (item.type === 'languages') {
    const languages = Array.isArray(resume.languages) ? resume.languages : []
    return (
      <div className="resume-block" data-block-id="languages">
        <span className="resume-label">Langues</span>
        {languages.map((language, index) => (
          <p className="resume-reference" key={`language-${index}`}>
            <strong>{language.name}</strong>{formatLanguageLevel(language.level)}
          </p>
        ))}
      </div>
    )
  }

  if (item.type === 'interests') {
    const interests = Array.isArray(resume.interests) ? resume.interests : []
    return (
      <div className="resume-block" data-block-id="interests">
        <span className="resume-label">Centres d’intérêt</span>
        <p>{interests.filter(Boolean).join(' · ')}</p>
      </div>
    )
  }

  return null
}

function RightBlock({ item, resume, formatDateRange, showLabel = true }) {
  if (item.type === 'exp') {
    const experiences = Array.isArray(resume.experiences) ? resume.experiences : []
    const experience = experiences[item.index]
    if (!experience) return null
    return (
      <div className={`resume-entry-wrap${showLabel ? ' resume-entry-wrap-labeled' : ''}`} data-block-id={item.id}>
        {showLabel && <span className="resume-label">Expérience</span>}
        <div className="resume-entry">
          <strong>{experience.company}</strong>
          <p>
            <span>{experience.jobTitle}</span>
            {(experience.startDate || experience.endDate) && <b>{formatDateRange(experience.startDate, experience.endDate)}</b>}
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
    const educations = Array.isArray(resume.educations) ? resume.educations : []
    const education = educations[item.index]
    if (!education) return null
    return (
      <div className={`resume-entry-wrap${showLabel ? ' resume-entry-wrap-labeled' : ''}`} data-block-id={item.id}>
        {showLabel && <span className="resume-label">Formation académique</span>}
        <div className="resume-entry">
          <strong>{education.school}</strong>
          <p>
            <span>{education.degree}</span>
            {(education.startDate || education.endDate) && <b>{formatDateRange(education.startDate, education.endDate)}</b>}
          </p>
        </div>
      </div>
    )
  }

  if (item.type === 'project') {
    const list = Array.isArray(resume[item.field]) ? resume[item.field] : []
    const entry = list[item.index]
    if (!entry) return null
    return (
      <div className={`resume-entry-wrap${showLabel ? ' resume-entry-wrap-labeled' : ''}`} data-block-id={item.id}>
        {showLabel && <span className="resume-label">{item.label}</span>}
        <div className="resume-entry">
          {entry.name && <strong>{entry.name}</strong>}
          {entry.description && <p>{entry.description}</p>}
          {entry.year && <b>{entry.year}</b>}
          {entry.link && <p>{entry.link}</p>}
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
  sectionVisibility,
  page,
  pageIndex,
  totalPages,
  formatDateRange,
  measure = false,
  style,
  showBranding,
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
      <ResumeHeader resume={resume} photo={photo} template={template} continued={continued} sectionVisibility={sectionVisibility} />
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
              <span className="resume-label" data-measure="project-label">Projets et réalisations</span>
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
        {showBranding && <span>Made With Love By CVcraft</span>}
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
  sectionVisibility = {},
  baseColor,
  selectedFont,
  formatDateRange,
  showBranding = true,
}) {
  const measureRef = useRef(null)
  const wrapRef = useRef(null)
  const [pages, setPages] = useState([{ left: [], right: [] }])
  const [scale, setScale] = useState(1)

  const leftItems = useMemo(() => {
    const visible = (section) => sectionVisibility[section] !== false
      && (template !== 'gratuit' || ['personal', 'experiences', 'educations', 'skills', 'languages'].includes(section))
    const personalVisible = visible('personal')
    const skills = Array.isArray(resume?.skills) ? resume.skills : []
    const certifications = Array.isArray(resume?.certifications) ? resume.certifications : []
    const references = Array.isArray(resume?.references) ? resume.references : []
    const languages = Array.isArray(resume?.languages) ? resume.languages : []
    const interests = Array.isArray(resume?.interests) ? resume.interests : []

    const items = []
    if (personalVisible && resume?.summary) items.push({ id: 'summary', type: 'summary' })
    if (visible('skills') && skills.some(Boolean)) items.push({ id: 'skills', type: 'skills' })
    if (visible('certifications') && certifications.some((item) => item.name || item.issuer || item.year)) items.push({ id: 'certs', type: 'certs' })
    if (visible('references') && references.some((item) => item.name || item.role || item.contact)) items.push({ id: 'refs', type: 'refs' })
    if (visible('languages') && languages.some((item) => item.name || item.level)) items.push({ id: 'languages', type: 'languages' })
    if (visible('interests') && interests.some(Boolean)) items.push({ id: 'interests', type: 'interests' })
    return items
  }, [resume, sectionVisibility, template])

  const rightItems = useMemo(() => {
    const visible = (section) => sectionVisibility[section] !== false
      && (template !== 'gratuit' || ['personal', 'experiences', 'educations', 'skills', 'languages'].includes(section))
    const experiences = Array.isArray(resume?.experiences) ? resume.experiences : []
    const educations = Array.isArray(resume?.educations) ? resume.educations : []

    const items = []
    if (visible('experiences')) experiences.slice(0, template === 'gratuit' ? 3 : undefined).forEach((entry, index) => {
      if (entry && Object.values(entry).some(Boolean)) items.push({ id: `exp-${index}`, type: 'exp', index })
    })
    if (visible('educations')) educations.forEach((entry, index) => {
      if (entry && Object.values(entry).some(Boolean)) items.push({ id: `edu-${index}`, type: 'edu', index })
    })
    const appendEntries = (field, type, label, isVisible) => {
      if (!isVisible) return
      const list = Array.isArray(resume?.[field]) ? resume[field] : []
      list.forEach((entry, index) => {
        if (!entry || !Object.values(entry).some(Boolean)) return
        items.push({ id: `${type}-${index}`, type, field, index, label })
      })
    }
    appendEntries('projects', 'project', 'Projets et réalisations', visible('projects'))
    return items
  }, [resume, sectionVisibility, template])

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
      // 1. Hauteur réelle occupée par chaque bloc dans le flux live (avec inter-blocs réels)
      const heights = {}
      const rightNodes = Array.from(root.querySelectorAll('.resume-right [data-block-id]'))
      rightNodes.forEach((node, index) => {
        const id = node.getAttribute('data-block-id')
        if (!id) return
        const nextNode = rightNodes[index + 1]
        if (nextNode) {
          const gap = nextNode.getBoundingClientRect().top - node.getBoundingClientRect().top
          heights[id] = Math.max(node.getBoundingClientRect().height, gap)
        } else {
          heights[id] = node.getBoundingClientRect().height
        }
      })

      const leftNodes = Array.from(root.querySelectorAll('.resume-left [data-block-id]'))
      leftNodes.forEach((node, index) => {
        const id = node.getAttribute('data-block-id')
        if (!id) return
        const nextNode = leftNodes[index + 1]
        if (nextNode) {
          const gap = nextNode.getBoundingClientRect().top - node.getBoundingClientRect().top
          heights[id] = Math.max(node.getBoundingClientRect().height, gap)
        } else {
          heights[id] = node.getBoundingClientRect().height
        }
      })

      const expLabel = root.querySelector('[data-measure="exp-label"]')
      const eduLabel = root.querySelector('[data-measure="edu-label"]')
      const projectLabel = root.querySelector('[data-measure="project-label"]')
      const labelHeights = {
        exp: expLabel ? expLabel.getBoundingClientRect().height + 10 : 26,
        edu: eduLabel ? eduLabel.getBoundingClientRect().height + 10 : 26,
        project: projectLabel ? projectLabel.getBoundingClientRect().height + 10 : 26,
      }

      const sheet1 = root.querySelector('.resume-sheet')
      const content1 = sheet1?.querySelector('[data-measure="content"]')
      const footer1 = sheet1?.querySelector('.resume-sheet-footer')
      const footerHeight = footer1?.getBoundingClientRect().height || 22

      // Position absolue de la limite supérieure de resume-sheet-footer depuis le haut de la feuille A4 (919px)
      // Le footer est positionné en absolute avec bottom: 28px
      const footerTopInSheet = RESUME_SHEET_HEIGHT - 28 - footerHeight

      // Position de début du contenu depuis le haut de la feuille
      const fullHeader = root.querySelector('[data-measure="header-full"]')
      const rule = root.querySelector('[data-measure="rule"]')
      const defaultContentTop = (fullHeader?.getBoundingClientRect().height || 0) + (rule?.getBoundingClientRect().height || 0) + 63
      const content1Top = content1 && sheet1
        ? (content1.getBoundingClientRect().top - sheet1.getBoundingClientRect().top)
        : defaultContentTop

      // Capacité de la page 1 : le contenu s'étend jusqu'à atteindre la div resume-sheet-footer
      const page1Capacity = Math.max(120, footerTopInSheet - content1Top - 2)

      // Position du contenu sur les pages suivantes (continuation)
      const continuedHeader = root.querySelector('[data-measure="header-continued"]')
      const continuedHeaderHeight = continuedHeader?.getBoundingClientRect().height || 50
      const continuedContentTop = 42 + continuedHeaderHeight + 18
      const nextCapacity = Math.max(180, footerTopInSheet - continuedContentTop - 2)

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
          if (id.startsWith('exp-') || id.startsWith('edu-') || id.startsWith('project-') || id.startsWith('volunteer-') || id.startsWith('publication-')) forcedBreaks.right.add(id)
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
          sectionVisibility={sectionVisibility}
          page={allPage}
          pageIndex={0}
          totalPages={1}
          formatDateRange={formatDateRange}
          measure
          style={sheetStyleVars}
          showBranding={showBranding}
        />
        <div className={`resume-sheet resume-template-${template} resume-sheet-continued resume-sheet-measure`} style={{ ...sheetStyleVars, width: RESUME_SHEET_WIDTH }}>
          <ResumeHeader resume={resume} photo={photo} template={template} continued sectionVisibility={sectionVisibility} />
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
              sectionVisibility={sectionVisibility}
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
              showBranding={showBranding}
            />
          ))}
        </div>
      </div>
    </>
  )
}
