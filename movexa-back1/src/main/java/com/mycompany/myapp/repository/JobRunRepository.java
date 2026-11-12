package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.JobRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobRunRepository extends JpaRepository<JobRun, Long> {}
