/* 3D and Blender Tools - a private notebook for 3D work. Built on tracker.js.

   Two lists and some notes, all kept in this browser only:
     1. Add-ons and assets   add-ons, asset libraries, reference photos, courses: what you own, use or want
     2. Ideas to build       tools you would like to make yourself, and how far each one has got
     3. Notes                free text in Markdown
   It does not look anything up, rate anything or sell anything: it holds what you type. */
const AREAS = ['Scattering and vegetation', 'Trees and plants', 'Buildings and interiors', 'Hard-surface and CAD-style modelling', 'Retopology and mesh tools', 'Terrain and landscape', 'Rendering, lighting and atmosphere', 'Materials and shading', 'Reference photos and textures', 'Learning', 'Utilities and workflow', 'Other'];

PBE.tool({
  id: '3d-and-blender-tools',
  title: '3D and Blender Tools',
  /* made-up example entries (labelled as examples), not anyone's real list */
  example: ({ daysAgo }) => ({
    things: [
      { date: daysAgo(40), name: 'Example scatter add-on', kind: 'Add-on', area: 'Scattering and vegetation', status: 'Using', where: 'Example shop', notes: 'made-up example' },
      { date: daysAgo(30), name: 'Example tree library', kind: 'Asset library', area: 'Trees and plants', status: 'Own', where: 'Example author', notes: 'made-up example' },
      { date: daysAgo(20), name: 'Example retopology add-on', kind: 'Add-on', area: 'Retopology and mesh tools', status: 'Want', where: '', notes: 'made-up example' },
      { date: daysAgo(10), name: 'Example brick texture pack', kind: 'Reference photos', area: 'Reference photos and textures', status: 'Want', where: '', notes: 'made-up example' },
    ],
    ideas: [
      { date: daysAgo(14), idea: 'Example: a pivot editor', area: 'Utilities and workflow', status: 'Idea', size: 'Small', notes: 'made-up example' },
      { date: daysAgo(7), idea: 'Example: a scatter mask painter', area: 'Scattering and vegetation', status: 'Building', size: 'Medium', notes: 'made-up example' },
    ],
  }),
  notice: 'A personal notebook. It holds only what you type, and it is stored in this browser (clear your site data and it is gone, so use the backup in My Data). Work in progress: expect bugs.',
  tabs: [
    { id: 'things', label: 'Add-ons and assets', type: 'log', addLabel: 'Add an item',
      intro: 'Anything you use, own or want for 3D work. Set the status as it changes. Use the filter to see just the wishlist, or just one area.',
      required: ['name'], filterBy: 'status',
      fields: [
        { key: 'date', label: 'Added', type: 'date' },
        { key: 'name', label: 'Name' },
        { key: 'kind', label: 'Kind', type: 'select', options: ['Add-on', 'Asset library', 'Reference photos', 'Course or tutorial', 'Software', 'Other'], keep: true },
        { key: 'area', label: 'Area', type: 'select', options: AREAS, keep: true },
        { key: 'status', label: 'Status', type: 'select', options: ['Noted', 'Want', 'Own', 'Using', 'Tried it', 'Skip'], keep: true },
        { key: 'where', label: 'Author or shop' },
        { key: 'notes', label: 'Notes' }],
      summary: (r) => [['Items', r.length], ['Using', r.filter((x) => x.status === 'Using').length], ['Own', r.filter((x) => x.status === 'Own').length], ['Wanted', r.filter((x) => x.status === 'Want').length]],
      charts: [{ title: 'By area', kind: 'bar', by: 'area', unit: 'items' }, { title: 'By status', kind: 'bar', by: 'status', unit: 'items' }, { title: 'By kind', kind: 'bar', by: 'kind', unit: 'items' }] },
    { id: 'ideas', label: 'Ideas to build', type: 'log', addLabel: 'Add an idea',
      intro: 'Tools you would like to build for yourself. A line or two is enough: say what it does and why you want it.',
      required: ['idea'], filterBy: 'status',
      fields: [
        { key: 'date', label: 'Added', type: 'date' },
        { key: 'idea', label: 'Idea' },
        { key: 'area', label: 'Area', type: 'select', options: AREAS, keep: true },
        { key: 'status', label: 'Status', type: 'select', options: ['Idea', 'Planned', 'Building', 'Done', 'Dropped'], keep: true },
        { key: 'size', label: 'Size', type: 'select', options: ['Small', 'Medium', 'Large'], keep: true },
        { key: 'notes', label: 'Notes' }],
      summary: (r) => [['Ideas', r.length], ['Building', r.filter((x) => x.status === 'Building').length], ['Done', r.filter((x) => x.status === 'Done').length]],
      charts: [{ title: 'By status', kind: 'bar', by: 'status', unit: 'ideas' }, { title: 'By area', kind: 'bar', by: 'area', unit: 'ideas' }] },
    { id: 'notes', label: 'Notes', type: 'notes', intro: 'Anything else: workflows, settings, links to remember, a half-formed plan. Give each note a title. Written in plain text or Markdown.' },
    { id: 'key', label: 'How it works', type: 'static', blocks: [
      { h: 'How this notebook works', p: 'It is two lists and a notes page. Nothing is looked up, checked or recommended: it holds what you type. Statuses are only labels for you.' },
      { table: [['Status (items)', 'Meaning'], ['Noted', 'On your list, not sorted yet'], ['Want', 'On the wishlist'], ['Own', 'Bought or downloaded, not yet in regular use'], ['Using', 'In regular use'], ['Tried it', 'Used it and moved on'], ['Skip', 'Decided against']] },
      { h3: 'A routine', list: ['Add things when you see them, even half-sure ones.', 'When you buy or install something, change its status.', 'Now and then, look at Ideas to build and pick one small thing to make.', 'Download a backup from My Data before clearing your browser.'] },
    ] },
  ],
});
