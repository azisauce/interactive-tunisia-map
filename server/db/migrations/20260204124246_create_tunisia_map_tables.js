/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Enable PostGIS extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis')

  // Create governorates table
  await knex.schema.createTable('governorates', (table) => {
    table.increments('id').primary()
    table.integer('gov_id').notNullable().unique()
    table.string('gov_en', 100).notNullable()
    table.string('gov_ar', 100)
    table.string('reg', 50)
    table.string('reg_en', 100)
    table.string('reg_ar', 100)
    table.specificType('geom', 'GEOMETRY(MultiPolygon, 4326)')
  })

  // Create municipalities table
  await knex.schema.createTable('municipalities', (table) => {
    table.increments('id').primary()
    table.integer('mun_uid').notNullable().unique()
    table.string('mun_en', 100).notNullable()
    table.string('mun_ar', 100)
    table.integer('gov_id').notNullable()
    table.string('gov_en', 100)
    table.string('gov_ar', 100)
    table.specificType('geom', 'GEOMETRY(MultiPolygon, 4326)')
    
    table.foreign('gov_id').references('gov_id').inTable('governorates')
  })

  // Create sectors table
  await knex.schema.createTable('sectors', (table) => {
    table.increments('id').primary()
    table.integer('sec_uid').notNullable().unique()
    table.string('sec_en', 100).notNullable()
    table.string('sec_ar', 100)
    table.integer('mun_uid').notNullable()
    table.integer('gov_id').notNullable()
    table.string('gov_en', 100)
    table.string('gov_ar', 100)
    table.integer('dis_id')
    table.string('dis_en', 100)
    table.string('dis_ar', 100)
    table.specificType('geom', 'GEOMETRY(MultiPolygon, 4326)')
  })

  // Create spatial indexes
  await knex.raw('CREATE INDEX idx_governorates_geom ON governorates USING GIST (geom)')
  await knex.raw('CREATE INDEX idx_municipalities_geom ON municipalities USING GIST (geom)')
  await knex.raw('CREATE INDEX idx_sectors_geom ON sectors USING GIST (geom)')

  // Create regular indexes for filtering
  await knex.schema.table('municipalities', (table) => {
    table.index('gov_id', 'idx_municipalities_gov_id')
  })

  await knex.schema.table('sectors', (table) => {
    table.index('mun_uid', 'idx_sectors_mun_uid')
    table.index('gov_id', 'idx_sectors_gov_id')
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('sectors')
  await knex.schema.dropTableIfExists('municipalities')
  await knex.schema.dropTableIfExists('governorates')
}
