const fs = require('fs')
const path = require('path')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  console.log('Starting database seeding...')

  // Read GeoJSON files
  const governoratesData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../geojson/governorates.geojson'), 'utf8')
  )
  const municipalitiesData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../geojson/municipalities.geojson'), 'utf8')
  )
  const sectorsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../geojson/sectors.geojson'), 'utf8')
  )

  // Clear existing data
  await knex('sectors').del()
  await knex('municipalities').del()
  await knex('governorates').del()
  console.log('Existing data cleared')

  // Aggregate governorates from municipalities data
  const govMap = new Map()
  governoratesData.features.forEach(feature => {
    const govId = feature.properties.gov_id
    if (!govMap.has(govId)) {
      govMap.set(govId, {
        gov_id: govId,
        gov_en: feature.properties.gov_en,
        gov_ar: feature.properties.gov_ar,
        reg: feature.properties.reg,
        reg_en: feature.properties.reg_en,
        reg_ar: feature.properties.reg_ar,
        geometries: []
      })
    }
    govMap.get(govId).geometries.push(feature.geometry)
  })

  // Insert governorates with aggregated geometries
  console.log('Inserting governorates...')
  for (const [govId, gov] of govMap) {
    // Combine all geometries into a MultiPolygon
    const multiPolygonCoords = []
    gov.geometries.forEach(geom => {
      if (geom.type === 'Polygon') {
        multiPolygonCoords.push(geom.coordinates)
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach(poly => multiPolygonCoords.push(poly))
      }
    })

    const multiPolygon = {
      type: 'MultiPolygon',
      coordinates: multiPolygonCoords
    }

    await knex.raw(
      `INSERT INTO governorates (gov_id, gov_en, gov_ar, reg, reg_en, reg_ar, geom)
       VALUES (?, ?, ?, ?, ?, ?, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))`,
      [gov.gov_id, gov.gov_en, gov.gov_ar, gov.reg, gov.reg_en, gov.reg_ar, JSON.stringify(multiPolygon)]
    )
  }
  console.log(`Inserted ${govMap.size} governorates`)

  // Insert municipalities
  console.log('Inserting municipalities...')
  let munCount = 0
  for (const feature of municipalitiesData.features) {
    const props = feature.properties
    let geom = feature.geometry
    
    // Convert Polygon to MultiPolygon if needed
    if (geom.type === 'Polygon') {
      geom = {
        type: 'MultiPolygon',
        coordinates: [geom.coordinates]
      }
    }

    await knex.raw(
      `INSERT INTO municipalities (mun_uid, mun_en, mun_ar, gov_id, gov_en, gov_ar, geom)
       VALUES (?, ?, ?, ?, ?, ?, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))`,
      [props.mun_uid, props.mun_en, props.mun_ar, props.gov_id, props.gov_en, props.gov_ar, JSON.stringify(geom)]
    )
    munCount++
  }
  console.log(`Inserted ${munCount} municipalities`)

  // Insert sectors
  console.log('Inserting sectors...')
  let secCount = 0
  for (const feature of sectorsData.features) {
    const props = feature.properties
    let geom = feature.geometry
    
    // Convert Polygon to MultiPolygon if needed
    if (geom.type === 'Polygon') {
      geom = {
        type: 'MultiPolygon',
        coordinates: [geom.coordinates]
      }
    }

    await knex.raw(
      `INSERT INTO sectors (sec_uid, sec_en, sec_ar, mun_uid, gov_id, gov_en, gov_ar, dis_id, dis_en, dis_ar, geom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))`,
      [
        props.sec_uid, props.sec_en, props.sec_ar, 
        props.mun_uid, props.gov_id, props.gov_en, props.gov_ar,
        props.dis_id, props.dis_en, props.dis_ar,
        JSON.stringify(geom)
      ]
    )
    secCount++
  }
  console.log(`Inserted ${secCount} sectors`)

  console.log('Database seeding completed successfully!')
}
