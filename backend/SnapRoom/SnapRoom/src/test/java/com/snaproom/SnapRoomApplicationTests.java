package com.snaproom;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class SnapRoomApplicationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {
        assertNotNull(jdbcTemplate);
    }

    @Test
    void testPgVectorExtensionAndOperations() {
        // 1. Verify extension exists
        String extVersion = jdbcTemplate.queryForObject(
                "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
                String.class
        );
        assertNotNull(extVersion, "pgvector extension must be installed in PostgreSQL");
        System.out.println("=================================================");
        System.out.println("pgvector extension version: " + extVersion);

        // 2. Test cosine distance operator <=>
        Double distance = jdbcTemplate.queryForObject(
                "SELECT ('[1,0,0]'::vector <=> '[0,1,0]'::vector)",
                Double.class
        );
        assertNotNull(distance);
        System.out.println("Cosine distance test result: " + distance);
        assertEquals(1.0, distance, 0.001, "Cosine distance between orthogonal vectors should be 1.0");

        // 3. Test L2 distance operator <->
        Double l2Distance = jdbcTemplate.queryForObject(
                "SELECT ('[1,2,3]'::vector <-> '[1,2,3]'::vector)",
                Double.class
        );
        assertNotNull(l2Distance);
        System.out.println("L2 distance test result: " + l2Distance);
        System.out.println("=================================================");
        assertEquals(0.0, l2Distance, 0.001, "L2 distance to identical vector should be 0.0");
    }

}
